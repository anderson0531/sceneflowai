'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Loader, Eye, Check, Undo, Redo, Film, Users, Edit, Wand2, AlertCircle, Sparkles } from 'lucide-react'
import { RecommendationsPanel } from './RecommendationsPanel'
import { InstructionsPanel } from './InstructionsPanel'
import { PreviewPanel } from './PreviewPanel'
import { CurrentScenePanel } from './CurrentScenePanel'
import { SceneComparisonPanel } from './SceneComparisonPanel'

interface Recommendation {
  id: string
  category: 'pacing' | 'dialogue' | 'visual' | 'character' | 'emotion' | 'clarity'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  before: string
  after: string
  rationale: string
  impact: string
}

interface QuickFix {
  id: string
  label: string
  instruction: string
  icon: string
}

interface SceneAnalysis {
  directorRecommendations: Recommendation[]
  audienceRecommendations: Recommendation[]
  quickFixes: QuickFix[]
  overallScore: number
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
  onApplyChanges: (sceneIndex: number, revisedScene: any) => void
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
  onApplyChanges
}: SceneEditorModalProps) {
  // State management
  const [sceneAnalysis, setSceneAnalysis] = useState<SceneAnalysis | null>(null)
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([])
  const [customInstruction, setCustomInstruction] = useState('')
  const [previewScene, setPreviewScene] = useState<any | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [revisionHistory, setRevisionHistory] = useState<any[]>([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const [showPreview, setShowPreview] = useState(false)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false)
  
  // Preservation options
  const [preserveNarration, setPreserveNarration] = useState(false)
  const [preserveDialogue, setPreserveDialogue] = useState(false)
  const [preserveMusic, setPreserveMusic] = useState(false)
  const [preserveSfx, setPreserveSfx] = useState(false)

  // Optimization state
  const [optimizedScene, setOptimizedScene] = useState<any | null>(null)
  const [changesSummary, setChangesSummary] = useState<any[]>([])
  const [showComparison, setShowComparison] = useState(false)

  // Initialize analysis when modal opens - REMOVED AUTO-ANALYSIS
  useEffect(() => {
    if (isOpen && scene) {
      // Don't auto-analyze, wait for user
      setRevisionHistory([scene])
      setCurrentHistoryIndex(0)
      setSceneAnalysis(null)
      setShowPreview(false)
    }
  }, [isOpen, scene])

  const analyzeScene = async () => {
    setIsAnalyzing(true)
    setShowLoadingOverlay(true)
    try {
      const response = await fetch('/api/vision/analyze-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          scene,
          context: {
            previousScene,
            nextScene,
            characters
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze scene')
      }

      const data = await response.json()
      setSceneAnalysis(data.analysis)
      
      // Pre-select high-priority recommendations
      const highPriority = [
        ...data.analysis.directorRecommendations,
        ...data.analysis.audienceRecommendations
      ]
        .filter(r => r.priority === 'high')
        .map(r => r.id)
      setSelectedRecommendations(highPriority)
    } catch (error) {
      console.error('[Scene Editor] Failed to analyze scene:', error)
    } finally {
      setIsAnalyzing(false)
      setShowLoadingOverlay(false)
    }
  }

  const optimizeScene = async () => {
    setIsGenerating(true)
    setShowLoadingOverlay(true)
    
    try {
      const response = await fetch('/api/vision/optimize-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          scene: revisionHistory[currentHistoryIndex],
          context: {
            previousScene,
            nextScene,
            characters
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to optimize scene')
      }

      const data = await response.json()
      
      setOptimizedScene(data.optimizedScene)
      setChangesSummary(data.changesSummary || [])
      
      // Add to revision history
      const newHistory = [...revisionHistory.slice(0, currentHistoryIndex + 1), data.optimizedScene]
      setRevisionHistory(newHistory)
      setCurrentHistoryIndex(newHistory.length - 1)
      
      // Set preview to optimized scene
      setPreviewScene(data.optimizedScene)
      setShowPreview(true)
      
    } catch (error) {
      console.error('[Scene Editor] Failed to optimize scene:', error)
    } finally {
      setIsGenerating(false)
      setShowLoadingOverlay(false)
    }
  }

  const handleGeneratePreview = async () => {
    // Allow preview generation with custom instruction even without analysis
    if (!sceneAnalysis && !customInstruction.trim()) {
      return // Only block if neither analysis nor custom instruction exists
    }

    setIsGenerating(true)
    setIsGeneratingPreview(true)
    try {
      const revisionMode = selectedRecommendations.length > 0 && customInstruction 
        ? 'hybrid' 
        : selectedRecommendations.length > 0 
        ? 'recommendations' 
        : 'instruction'

      const preserveElements = []
      if (preserveNarration) preserveElements.push('narration')
      if (preserveDialogue) preserveElements.push('dialogue')
      if (preserveMusic) preserveElements.push('music')
      if (preserveSfx) preserveElements.push('sfx')

      const response = await fetch('/api/vision/revise-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          currentScene: scene,
          revisionMode,
          selectedRecommendations,
          customInstruction,
          preserveElements,
          context: {
            characters,
            previousScene,
            nextScene
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to revise scene')
      }

      const data = await response.json()
      setPreviewScene(data.revisedScene)
      
      // Switch to preview mode
      setShowPreview(true)
    } catch (error) {
      console.error('[Scene Editor] Failed to generate preview:', error)
    } finally {
      setIsGenerating(false)
      setIsGeneratingPreview(false)
    }
  }

  const handleApplyChanges = () => {
    if (!previewScene) return

    // Save to history
    const newHistory = [...revisionHistory.slice(0, currentHistoryIndex + 1), previewScene]
    setRevisionHistory(newHistory)
    setCurrentHistoryIndex(newHistory.length - 1)

    // Store which recommendations were applied for future scoring context
    const revisedSceneWithMetadata = {
      ...previewScene,
      appliedRecommendations: selectedRecommendations  // Track applied recommendations
    }

    // Apply changes
    onApplyChanges(sceneIndex, revisedSceneWithMetadata)
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

  const handleToggleRecommendation = (recommendationId: string) => {
    console.log('[Scene Editor] Toggling recommendation:', recommendationId)
    setSelectedRecommendations(prev => {
      const newSelection = prev.includes(recommendationId)
        ? prev.filter(id => id !== recommendationId)
        : [...prev, recommendationId]
      console.log('[Scene Editor] New selection:', newSelection)
      return newSelection
    })
  }

  const handleApplyQuickFix = (quickFix: QuickFix) => {
    setCustomInstruction(quickFix.instruction)
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-green-500'
    if (score >= 75) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const hasChanges = selectedRecommendations.length > 0 || customInstruction.trim()

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
          <div className="grid grid-cols-2 gap-6 h-[calc(90vh-200px)]">
            {/* Left: Current Scene */}
            <div className="overflow-y-auto">
              <CurrentScenePanel scene={scene} />
            </div>
            
            {/* Right: Recommendations & Instructions */}
            <div className="overflow-y-auto">
              <Tabs defaultValue="instructions">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="instructions">
                    Instructions
                  </TabsTrigger>
                  <TabsTrigger value="recommendations">
                    Ask Flow ({(sceneAnalysis?.directorRecommendations?.length || 0) + (sceneAnalysis?.audienceRecommendations?.length || 0)})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="recommendations">
                  {!optimizedScene && !changesSummary.length ? (
                    <div className="space-y-4">
                      <Button
                        variant="default"
                        size="default"
                        onClick={() => optimizeScene()}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        {isGenerating ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Optimizing Scene...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Optimize Scene
                          </>
                        )}
                      </Button>

                      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900 dark:text-blue-100">Holistic Scene Optimization</p>
                          <p className="text-blue-700 dark:text-blue-300 mt-1">
                            Your Flow Assistant will analyze the scene from both director and audience perspectives, 
                            then generate a fully optimized version with detailed explanations of what changed and why.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Changes Summary */}
                      {changesSummary.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-3">Summary of Changes and Rationale</h3>
                          <div className="space-y-3">
                            {changesSummary.map((change: any, idx: number) => (
                              <div key={idx} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                <h4 className="font-medium text-sm mb-2">{idx + 1}. {change.category}</h4>
                                <div className="text-xs space-y-2">
                                  <div>
                                    <Badge variant="outline" className="mr-2">Changes</Badge>
                                    <p className="text-gray-700 dark:text-gray-300 mt-1">{change.changes}</p>
                                  </div>
                                  {change.rationaleDirector && (
                                    <div>
                                      <Badge variant="outline" className="mr-2">
                                        <Film className="w-3 h-3 inline mr-1" />
                                        Director
                                      </Badge>
                                      <p className="text-gray-700 dark:text-gray-300 mt-1">{change.rationaleDirector}</p>
                                    </div>
                                  )}
                                  {change.rationaleAudience && (
                                    <div>
                                      <Badge variant="outline" className="mr-2">
                                        <Users className="w-3 h-3 inline mr-1" />
                                        Audience
                                      </Badge>
                                      <p className="text-gray-700 dark:text-gray-300 mt-1">{change.rationaleAudience}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* View Side-by-Side Button */}
                      {optimizedScene && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowComparison(!showComparison)}
                          className="w-full"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {showComparison ? 'Hide' : 'View'} Side-by-Side Comparison
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="instructions">
                  <InstructionsPanel
                    instruction={customInstruction}
                    onInstructionChange={setCustomInstruction}
                  />
                </TabsContent>
              </Tabs>
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
                previewScene={previewScene}
                isGenerating={isGenerating}
                changes={selectedRecommendations}
              />
            )}
          </div>
        )}

        {/* Footer Actions */}
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {hasChanges ? `${selectedRecommendations.length} suggestion${selectedRecommendations.length !== 1 ? 's' : ''} selected` : 'No changes selected'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {!showPreview ? (
                <>
                  <Button
                    onClick={handleGeneratePreview}
                    disabled={isGenerating || !hasChanges || isAnalyzing}
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
                </>
              ) : (
                <>
                  <Button
                    onClick={handleApplyChanges}
                    disabled={!previewScene || isGenerating}
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
        
        {/* Loading Overlay - Blocks UI during analysis */}
        {showLoadingOverlay && (
          <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <div className="relative mb-6">
                <Loader className="w-16 h-16 animate-spin mx-auto text-blue-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-blue-200 dark:border-blue-800 animate-pulse"></div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Analyzing Scene with Flow Assistant
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Your Flow Assistant is analyzing the scene...
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                This typically takes 10-30 seconds. Please wait.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Preview Loading Overlay */}
        {isGeneratingPreview && (
          <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <div className="relative mb-6">
                <Loader className="w-16 h-16 animate-spin mx-auto text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Generating Preview
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your Flow Assistant is generating the preview...
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                This may take 10-15 seconds
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
