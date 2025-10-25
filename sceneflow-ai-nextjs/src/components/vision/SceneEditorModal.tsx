'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Loader, Eye, Check, Undo, Redo, Film, Users, Edit, Wand2, AlertCircle } from 'lucide-react'
import { RecommendationsPanel } from './RecommendationsPanel'
import { InstructionsPanel } from './InstructionsPanel'
import { PreviewPanel } from './PreviewPanel'
import { CurrentScenePanel } from './CurrentScenePanel'

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
  
  // Preservation options
  const [preserveNarration, setPreserveNarration] = useState(false)
  const [preserveDialogue, setPreserveDialogue] = useState(false)
  const [preserveMusic, setPreserveMusic] = useState(false)
  const [preserveSfx, setPreserveSfx] = useState(false)

  // Initialize analysis when modal opens
  useEffect(() => {
    if (isOpen && scene) {
      analyzeScene()
      // Save initial state to history
      setRevisionHistory([scene])
      setCurrentHistoryIndex(0)
    }
  }, [isOpen, scene])

  const analyzeScene = async () => {
    setIsAnalyzing(true)
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
      console.error('Failed to analyze scene:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleGeneratePreview = async () => {
    if (!sceneAnalysis) return

    setIsGenerating(true)
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
    } catch (error) {
      console.error('Failed to generate preview:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyChanges = () => {
    if (!previewScene) return

    // Save to history
    const newHistory = [...revisionHistory.slice(0, currentHistoryIndex + 1), previewScene]
    setRevisionHistory(newHistory)
    setCurrentHistoryIndex(newHistory.length - 1)

    // Apply changes
    onApplyChanges(sceneIndex, previewScene)
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
    setSelectedRecommendations(prev => 
      prev.includes(recommendationId)
        ? prev.filter(id => id !== recommendationId)
        : [...prev, recommendationId]
    )
  }

  const handleApplyQuickFix = (quickFix: QuickFix) => {
    setCustomInstruction(quickFix.instruction)
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-green-500'
    if (score >= 75) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const hasRecommendations = selectedRecommendations.length > 0 || customInstruction.trim()

  if (!scene) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Edit Scene {sceneIndex + 1}</DialogTitle>
              <DialogDescription>{scene.heading || 'Untitled Scene'}</DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {sceneAnalysis && (
                <Badge className={`${getScoreColor(sceneAnalysis.overallScore)} text-white`}>
                  Score: {sceneAnalysis.overallScore}/100
                </Badge>
              )}
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

        {/* Three-Panel Layout */}
        <div className="grid grid-cols-3 gap-4 h-[calc(90vh-200px)]">
          {/* Left Panel: Current Scene */}
          <div className="col-span-1 overflow-y-auto">
            <CurrentScenePanel scene={scene} />
          </div>

          {/* Middle Panel: Recommendations & Instructions */}
          <div className="col-span-1 overflow-y-auto">
            <Tabs defaultValue="recommendations">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="recommendations">
                  AI Suggestions ({(sceneAnalysis?.directorRecommendations?.length || 0) + (sceneAnalysis?.audienceRecommendations?.length || 0)})
                </TabsTrigger>
                <TabsTrigger value="instructions">
                  Direct Edit
                </TabsTrigger>
              </TabsList>

              <TabsContent value="recommendations">
                {isAnalyzing ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin mr-2" />
                    <span>Analyzing scene...</span>
                  </div>
                ) : sceneAnalysis ? (
                  <RecommendationsPanel
                    directorRecs={sceneAnalysis.directorRecommendations}
                    audienceRecs={sceneAnalysis.audienceRecommendations}
                    quickFixes={sceneAnalysis.quickFixes}
                    selectedRecs={selectedRecommendations}
                    onToggleRec={handleToggleRecommendation}
                    onApplyQuickFix={handleApplyQuickFix}
                  />
                ) : (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    <AlertCircle className="w-6 h-6 mr-2" />
                    <span>Failed to load recommendations</span>
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

          {/* Right Panel: Preview */}
          <div className="col-span-1 overflow-y-auto">
            <PreviewPanel
              originalScene={scene}
              previewScene={previewScene}
              isGenerating={isGenerating}
              changes={selectedRecommendations}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="preserve-narration"
                  checked={preserveNarration}
                  onCheckedChange={setPreserveNarration}
                />
                <label htmlFor="preserve-narration" className="text-sm">
                  Preserve narration
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="preserve-dialogue"
                  checked={preserveDialogue}
                  onCheckedChange={setPreserveDialogue}
                />
                <label htmlFor="preserve-dialogue" className="text-sm">
                  Preserve dialogue
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="preserve-music"
                  checked={preserveMusic}
                  onCheckedChange={setPreserveMusic}
                />
                <label htmlFor="preserve-music" className="text-sm">
                  Preserve music/SFX
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGeneratePreview}
                disabled={isGenerating || !hasRecommendations}
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    Generating Preview...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Changes
                  </>
                )}
              </Button>
              <Button
                onClick={handleApplyChanges}
                disabled={!previewScene || isGenerating}
                className="bg-sf-primary"
              >
                <Check className="w-4 h-4 mr-2" />
                Apply Changes
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
