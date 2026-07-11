'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Loader, Eye, Check, Undo, Redo, Sparkles, Volume2, X } from 'lucide-react'
import { InstructionsPanel } from './InstructionsPanel'
import { PreviewPanel } from './PreviewPanel'
import { CurrentScenePanel } from './CurrentScenePanel'
import { SceneComparisonPanel } from './SceneComparisonPanel'
import { useOverlayStore } from '@/store/useOverlayStore'
import type { PreserveElement } from '@/lib/audio/cleanupAudio'
import {
  applyDeselectedSceneChanges,
  buildEffectiveCandidateScene,
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
  script?: any
  onApplyChanges: (sceneIndex: number, revisedScene: any, options?: SceneEditorApplyOptions) => void
  // Initial instructions to pre-populate (from Apply Recommendations)
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
  script,
  onApplyChanges,
  initialInstructions = ''
}: SceneEditorModalProps) {
  // State management
  const [customInstruction, setCustomInstruction] = useState(initialInstructions)
  const [previewScene, setPreviewScene] = useState<any | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [revisionHistory, setRevisionHistory] = useState<any[]>([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const [showPreview, setShowPreview] = useState(false)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false)
  
  // Preservation options (5 categories)
  const [preserveDialogueBeats, setPreserveDialogueBeats] = useState(false)
  const [preserveActionBeats, setPreserveActionBeats] = useState(false)
  const [preserveMusic, setPreserveMusic] = useState(false)
  const [preserveSceneDirection, setPreserveSceneDirection] = useState(false)
  const [preserveBeatFrames, setPreserveBeatFrames] = useState(false)

  // Per-change unselect in preview (empty = all selected)
  const [deselectedChanges, setDeselectedChanges] = useState<Set<string>>(() => new Set())

  // Optimization state
  const [optimizedScene, setOptimizedScene] = useState<any | null>(null)
  const [changesSummary, setChangesSummary] = useState<any[]>([])
  const [showComparison, setShowComparison] = useState(false)
  const [sceneDescription, setSceneDescription] = useState(scene?.visualDescription || '')
  const [narrationText, setNarrationText] = useState(scene?.narration || '')
  
  // Applied recommendations tracking (for instruction panel)
  const [appliedRecommendationIds, setAppliedRecommendationIds] = useState<string[]>([])
  
  // Constants for instruction limits
  const MAX_INSTRUCTIONS = 5
  
  // Count instructions (numbered lines starting with digit+period)
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

  // Append instruction with numbered format
  const appendInstruction = (newText: string, recommendationId?: string) => {
    if (!canAddMoreInstructions) return
    
    // Track recommendation ID
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

  const syncSceneDescriptionFrom = useCallback((candidate?: any) => {
    if (candidate && typeof candidate.visualDescription === 'string') {
      setSceneDescription(candidate.visualDescription)
    }
    // Also sync narration when AI revision returns a scene
    if (candidate && typeof candidate.narration === 'string') {
      setNarrationText(candidate.narration)
    }
  }, [])

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen && scene) {
      setRevisionHistory([scene])
      setCurrentHistoryIndex(0)
      setShowPreview(false)
      setSceneDescription(scene.visualDescription || '')
      setNarrationText(scene.narration || '')
      // Set initial instructions if provided (from Apply Recommendations)
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
    setIsGeneratingPreview(true)
    
    // Show animated processing overlay
    overlayStore.show(`Revising Scene ${sceneIndex + 1}...`, 20, 'scene-revision')
    
    try {
      const preserveElements = buildPreserveElements()

      overlayStore.setProgress(15)
      overlayStore.setStatus('Analyzing instructions...')

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
      syncSceneDescriptionFrom(data.revisedScene)
      setDeselectedChanges(new Set())
      
      // Add to revision history
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
      setIsGeneratingPreview(false)
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
    const sourceScene = previewScene || revisionHistory[currentHistoryIndex] || scene
    if (!sourceScene) return

    const cleanedDescription = sceneDescription?.trim() || ''
    const cleanedNarration = narrationText?.trim() || ''

    let revisedSceneWithMetadata: any
    if (showPreview && previewScene) {
      revisedSceneWithMetadata = applyDeselectedSceneChanges(
        scene,
        buildEffectiveCandidateScene(sourceScene, {
          visualDescription: cleanedDescription,
          narration: cleanedNarration,
        }),
        deselectedChanges
      )
    } else {
      revisedSceneWithMetadata = {
        ...sourceScene,
        visualDescription: cleanedDescription,
        narration: cleanedNarration,
      }
    }

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
      const rewritten = revisionHistory[newIndex]
      setPreviewScene(rewritten)
      syncSceneDescriptionFrom(rewritten)
    }
  }

  const handleRedo = () => {
    if (currentHistoryIndex < revisionHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1
      setCurrentHistoryIndex(newIndex)
      const rewritten = revisionHistory[newIndex]
      setPreviewScene(rewritten)
      syncSceneDescriptionFrom(rewritten)
    }
  }

  const normalizeDescription = (value?: string | null) => (value ?? '').trim()
  const descriptionChanged = normalizeDescription(scene.visualDescription) !== normalizeDescription(sceneDescription)
  const narrationChanged = normalizeDescription(scene.narration) !== normalizeDescription(narrationText)
  const hasAIChanges = customInstruction.trim().length > 0
  const effectivePreviewScene = previewScene
    ? buildEffectiveCandidateScene(previewScene, {
        visualDescription: sceneDescription,
        narration: narrationText,
      })
    : null
  const previewChangeKeys = effectivePreviewScene
    ? diffSceneChanges(scene, effectivePreviewScene)
    : []
  const { selected: selectedPreviewChanges } = countSelectedChanges(
    previewChangeKeys,
    deselectedChanges
  )
  const canApplyPreview = Boolean(previewScene) && selectedPreviewChanges > 0
  const changeStatusMessage = hasAIChanges
    ? 'Custom instruction ready'
    : descriptionChanged || narrationChanged
      ? narrationChanged && descriptionChanged
        ? 'Scene description & narration updated'
        : narrationChanged
          ? 'Narration updated'
          : 'Scene description updated'
      : 'No changes'

  // Extract recommendations from scene's audienceAnalysis (from scene card analysis)
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

        {/* Two-Column Layout with Preview Mode */}
        {!showPreview ? (
          // Edit Mode: Two columns
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(90vh-200px)]">
            {/* Left: Current Scene */}
            <div className="overflow-y-auto">
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-500 mb-2 block">
                  Scene Description
                </label>
                <Textarea
                  value={sceneDescription}
                  onChange={(event) => setSceneDescription(event.target.value)}
                  placeholder={scene.action || 'Describe what the viewer should see.'}
                  className="min-h-[140px]"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This text plays before narration and powers storyboard/image prompts.
                </p>
              </div>
              
              {/* Narration Text — editable so users can remove/edit phantom narration */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" />
                  Narration
                  {narrationText && (
                    <button
                      type="button"
                      onClick={() => setNarrationText('')}
                      className="ml-auto text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                      title="Remove narration"
                    >
                      <X className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </label>
                <Textarea
                  value={narrationText}
                  onChange={(event) => setNarrationText(event.target.value)}
                  placeholder="Optional narration voiceover text. Leave empty for no narration."
                  className="min-h-[80px]"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Voiceover text for the scene. Clear this field to remove narration entirely.
                </p>
              </div>

              <CurrentScenePanel scene={scene} />
            </div>
            
            {/* Right: Instructions */}
            <div className="overflow-y-auto">
              <div className="space-y-4">
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
                
                {/* Preservation Options */}
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
          </div>
        ) : (
          // Preview Mode: Single column
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
                previewScene={effectivePreviewScene}
                isGenerating={isGenerating}
                changes={[]}
                deselectedChanges={deselectedChanges}
                onToggleChange={handleToggleChange}
              />
            )}
          </div>
        )}

        {/* Footer Actions */}
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {changeStatusMessage}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {!showPreview ? (
                <>
                  {hasAIChanges ? (
                    <Button
                      onClick={handleGeneratePreview}
                      disabled={isGenerating}
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
                      disabled={!descriptionChanged && !narrationChanged}
                      className="bg-sf-primary"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    onClick={handleApplyChanges}
                    disabled={!canApplyPreview || isGenerating}
                    className="bg-sf-primary"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Apply Changes
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
