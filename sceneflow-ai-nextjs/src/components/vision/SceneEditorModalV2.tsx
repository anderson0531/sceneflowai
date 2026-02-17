'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Loader, Eye, Check, Undo, Redo, Film, Users, Edit, Wand2, AlertCircle, Sparkles, Mic, MicOff, CheckCircle, XCircle, Lightbulb, Target, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { InstructionsPanel } from './InstructionsPanel'
import { PreviewPanel } from './PreviewPanel'
import { CurrentScenePanel } from './CurrentScenePanel'
import { SceneComparisonPanel } from './SceneComparisonPanel'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { RecommendationPriority } from '@/types/story'
import { useOverlayStore } from '@/store/useOverlayStore'
import { 
  PRIORITY_BADGES,
  normalizeRecommendation,
  SceneRecommendation as SharedSceneRecommendation,
  SceneAnalysis
} from '@/lib/constants/scene-optimization'

interface SceneReview {
  overallScore: number
  categories: { name: string; score: number; weight?: number }[]
  analysis: string
  strengths: string[]
  improvements: string[]
  recommendations: SceneRecommendation[]
  generatedAt: string
}

// Recommendation with priority (supports both old string format and new object format)
interface SceneRecommendation {
  id?: string
  text?: string
  priority?: RecommendationPriority
  category?: string
  // Fallback for old string format
  [key: string]: any
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
  onApplyChanges: (sceneIndex: number, revisedScene: any) => void
  onUpdateSceneScores?: (sceneIndex: number, directorScore: number, audienceScore: number, dialogReviews: any) => void
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
  onUpdateSceneScores,
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
  
  // Preservation options
  const [preserveNarration, setPreserveNarration] = useState(false)
  const [preserveDialogue, setPreserveDialogue] = useState(false)
  const [preserveMusic, setPreserveMusic] = useState(false)
  const [preserveSfx, setPreserveSfx] = useState(false)

  // Optimization state
  const [optimizedScene, setOptimizedScene] = useState<any | null>(null)
  const [changesSummary, setChangesSummary] = useState<any[]>([])
  const [showComparison, setShowComparison] = useState(false)
  const [sceneDescription, setSceneDescription] = useState(scene?.visualDescription || '')

  // Scene Review state
  const [directorReview, setDirectorReview] = useState<SceneReview | null>(null)
  const [audienceReview, setAudienceReview] = useState<SceneReview | null>(null)
  const [isLoadingReview, setIsLoadingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [leftPanelTab, setLeftPanelTab] = useState<'scene' | 'director' | 'audience'>('scene')
  
  // Score stabilization: Track applied recommendations
  const [appliedRecommendationIds, setAppliedRecommendationIds] = useState<string[]>(
    scene?.appliedRecommendationIds || scene?.scoreAnalysis?.appliedRecommendationIds || []
  )
  const [appliedRecommendationPriorities, setAppliedRecommendationPriorities] = useState<Record<string, RecommendationPriority>>({})
  const [isResetting, setIsResetting] = useState(false)
  
  // Reset scene review state (for major changes)
  const handleResetSceneReview = async () => {
    if (isResetting) return
    
    setIsResetting(true)
    try {
      // Call API to reset review history for this scene
      await fetch(`/api/vision/review-history?projectId=${projectId}&sceneIndex=${sceneIndex}`, {
        method: 'DELETE'
      })
      
      // Clear local state
      setDirectorReview(null)
      setAudienceReview(null)
      setAppliedRecommendationIds([])
      setAppliedRecommendationPriorities({})
      setReviewError(null)
      
      console.log(`[SceneEditor] Reset review state for scene ${sceneIndex}`)
    } catch (error) {
      console.error('[SceneEditor] Failed to reset review:', error)
      setReviewError('Failed to reset review state')
    } finally {
      setIsResetting(false)
    }
  }
  
  // Reset all scenes review state (for major script changes)
  const handleResetAllScenesReview = async () => {
    if (isResetting) return
    
    setIsResetting(true)
    try {
      // Call API to reset all review history
      await fetch(`/api/vision/review-history?projectId=${projectId}`, {
        method: 'DELETE'
      })
      
      // Clear local state
      setDirectorReview(null)
      setAudienceReview(null)
      setAppliedRecommendationIds([])
      setAppliedRecommendationPriorities({})
      setReviewError(null)
      
      console.log(`[SceneEditor] Reset all scenes review state for project ${projectId}`)
    } catch (error) {
      console.error('[SceneEditor] Failed to reset all reviews:', error)
      setReviewError('Failed to reset all review states')
    } finally {
      setIsResetting(false)
    }
  }
  
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

  // Append instruction with numbered format and track for score stabilization
  const appendInstruction = (newText: string, recommendationId?: string) => {
    if (!canAddMoreInstructions) return
    
    // Track recommendation ID for score stabilization
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

  // Voice input
  const {
    supported: voiceSupported,
    isSecure,
    isRecording,
    transcript,
    error: voiceError,
    start: startRecording,
    stop: stopRecording,
    setTranscript,
    permission: micPermission
  } = useSpeechRecognition()
  
  const [baseInstruction, setBaseInstruction] = useState('')

  const syncSceneDescriptionFrom = useCallback((candidate?: any) => {
    if (candidate && typeof candidate.visualDescription === 'string') {
      setSceneDescription(candidate.visualDescription)
    }
  }, [])

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen && scene) {
      setRevisionHistory([scene])
      setCurrentHistoryIndex(0)
      setShowPreview(false)
      setSceneDescription(scene.visualDescription || '')
      // Set initial instructions if provided (from Apply Recommendations)
      setCustomInstruction(initialInstructions || '')
      // Load existing reviews from scene if available
      if (scene.dialogReviews?.director) {
        setDirectorReview(scene.dialogReviews.director)
      } else {
        setDirectorReview(null)
      }
      if (scene.dialogReviews?.audience) {
        setAudienceReview(scene.dialogReviews.audience)
      } else {
        setAudienceReview(null)
      }
      setReviewError(null)
      setLeftPanelTab('scene')
    }
  }, [isOpen, scene, initialInstructions])

  // Handle voice transcript updates
  useEffect(() => {
    if (transcript) {
      setCustomInstruction(baseInstruction + (baseInstruction ? ' ' : '') + transcript)
    }
  }, [transcript, baseInstruction])

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      setBaseInstruction(customInstruction)
      setTranscript('')
      startRecording()
    }
  }

  const fetchSceneReview = async (useCurrentEdits: boolean = false) => {
    setIsLoadingReview(true)
    setReviewError(null)
    
    try {
      // Use the current edited scene content if requested (for re-scoring after changes)
      const sceneToReview = useCurrentEdits 
        ? {
            ...scene,
            visualDescription: sceneDescription,
            // Include any preview changes if available
            ...(previewScene || {})
          }
        : scene
      
      const response = await fetch('/api/vision/review-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          scene: sceneToReview,
          script: script || { scenes: [sceneToReview], characters }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate scene review')
      }

      const data = await response.json()
      setDirectorReview(data.director)
      setAudienceReview(data.audience)
      
      // Immediately update project with new scores (when re-scoring with edits)
      if (useCurrentEdits && onUpdateSceneScores && data.director && data.audience) {
        const dialogReviews = {
          director: data.director,
          audience: data.audience,
          lastUpdated: new Date().toISOString()
        }
        onUpdateSceneScores(sceneIndex, data.director.overallScore, data.audience.overallScore, dialogReviews)
      }
      
      // Auto-switch to director review tab
      setLeftPanelTab('director')
    } catch (error: any) {
      console.error('[Scene Review] Error:', error)
      setReviewError(error.message || 'Failed to generate review')
    } finally {
      setIsLoadingReview(false)
    }
  }

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
      const preserveElements = []
      if (preserveNarration) preserveElements.push('narration')
      if (preserveDialogue) preserveElements.push('dialogue')
      if (preserveMusic) preserveElements.push('music')
      if (preserveSfx) preserveElements.push('sfx')

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

  const handleApplyChanges = () => {
    const sourceScene = previewScene || revisionHistory[currentHistoryIndex] || scene
    if (!sourceScene) return

    const cleanedDescription = sceneDescription?.trim() || ''

    // Include applied recommendation IDs for score stabilization and dialog reviews for persistence
    const revisedSceneWithMetadata = {
      ...sourceScene,
      visualDescription: cleanedDescription,
      appliedRecommendationIds: appliedRecommendationIds.length > 0 ? appliedRecommendationIds : (sourceScene.appliedRecommendationIds || []),
      analysisIterationCount: (sourceScene.analysisIterationCount || 0) + (appliedRecommendationIds.length > 0 ? 1 : 0),
      // Persist dialog reviews with the scene
      dialogReviews: {
        director: directorReview || sourceScene.dialogReviews?.director || null,
        audience: audienceReview || sourceScene.dialogReviews?.audience || null,
        lastUpdated: (directorReview || audienceReview) ? new Date().toISOString() : sourceScene.dialogReviews?.lastUpdated
      },
      // Also update scoreAnalysis for scene card header display (if we have new reviews)
      scoreAnalysis: (directorReview || audienceReview) ? {
        ...(sourceScene.scoreAnalysis || {}),
        overallScore: directorReview?.overallScore || audienceReview?.overallScore || sourceScene.scoreAnalysis?.overallScore,
        directorScore: directorReview?.overallScore || sourceScene.scoreAnalysis?.directorScore,
        audienceScore: audienceReview?.overallScore || sourceScene.scoreAnalysis?.audienceScore,
        generatedAt: new Date().toISOString(),
        iterationCount: (sourceScene.scoreAnalysis?.iterationCount || 0) + 1,
        appliedRecommendationIds: appliedRecommendationIds.length > 0 ? appliedRecommendationIds : (sourceScene.appliedRecommendationIds || [])
      } : sourceScene.scoreAnalysis
    }

    const newHistory = [...revisionHistory.slice(0, currentHistoryIndex + 1), revisedSceneWithMetadata]
    setRevisionHistory(newHistory)
    setCurrentHistoryIndex(newHistory.length - 1)

    onApplyChanges(sceneIndex, revisedSceneWithMetadata)
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

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    if (score >= 80) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
    return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
  }

  const normalizeDescription = (value?: string | null) => (value ?? '').trim()
  const descriptionChanged = normalizeDescription(scene.visualDescription) !== normalizeDescription(sceneDescription)
  const hasAIChanges = customInstruction.trim().length > 0
  const changeStatusMessage = hasAIChanges
    ? 'Custom instruction ready'
    : descriptionChanged
      ? 'Scene description updated'
      : 'No changes'

  // Review Panel Component
  const ReviewPanel = ({ review, type }: { review: SceneReview | null; type: 'director' | 'audience' }) => {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      analysis: true,
      strengths: false,
      improvements: false,
      recommendations: true
    })

    const toggleSection = (section: string) => {
      setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    if (!review) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-12">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              {type === 'director' ? (
                <Film className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              ) : (
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {type === 'director' ? 'Director Review' : 'Audience Review'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Get AI-powered analysis of this scene from {type === 'director' ? 'a professional filmmaking' : 'an audience'} perspective.
            </p>
            <Button
              onClick={fetchSceneReview}
              disabled={isLoadingReview}
              className="bg-sf-primary"
            >
              {isLoadingReview ? (
                <>
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get Scene Review
                </>
              )}
            </Button>
            {reviewError && (
              <p className="text-sm text-red-600 mt-3">{reviewError}</p>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Score Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {type === 'director' ? 'Director Review' : 'Audience Review'}
            </h3>
            <p className="text-xs text-gray-500">Scene {sceneIndex + 1}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-3xl font-bold px-4 py-2 rounded-lg ${getScoreColor(review.overallScore)}`}>
              {review.overallScore}
            </div>
            {/* Action buttons */}
            <div className="flex flex-col gap-1">
              {/* Update Scores - Re-analyze with current edits */}
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs bg-sf-primary hover:bg-sf-primary/90"
                onClick={() => fetchSceneReview(true)}
                disabled={isLoadingReview}
                title="Re-analyze scene with your current edits to get updated scores"
              >
                {isLoadingReview ? (
                  <Loader className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                Update Scores
              </Button>
              {/* Clear Applied - Reset recommendation tracking */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                onClick={handleResetSceneReview}
                disabled={isResetting}
                title="Clear applied recommendations and start fresh review cycle"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Clear Applied
              </Button>
            </div>
          </div>
        </div>

        {/* Applied Recommendations Count */}
        {appliedRecommendationIds.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800 dark:text-green-400">
              {appliedRecommendationIds.length} recommendation(s) applied
            </span>
          </div>
        )}

        {/* Category Scores */}
        <div className="grid grid-cols-2 gap-2">
          {review.categories.map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/30 rounded text-xs">
              <span className="text-gray-600 dark:text-gray-400">{cat.name}</span>
              <span className={`font-semibold px-2 py-0.5 rounded ${getScoreColor(cat.score)}`}>
                {cat.score}
              </span>
            </div>
          ))}
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-2">
          {/* Analysis */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('analysis')}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="font-medium text-sm">Analysis</span>
              {expandedSections.analysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSections.analysis && (
              <div className="p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {review.analysis}
              </div>
            )}
          </div>

          {/* Strengths */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('strengths')}
              className="w-full flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
            >
              <span className="font-medium text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Strengths ({review.strengths.length})
              </span>
              {expandedSections.strengths ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSections.strengths && (
              <ul className="p-3 space-y-2">
                {review.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {strength}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Improvements */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('improvements')}
              className="w-full flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
            >
              <span className="font-medium text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-yellow-600" />
                Areas for Improvement ({review.improvements.length})
              </span>
              {expandedSections.improvements ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSections.improvements && (
              <ul className="p-3 space-y-2">
                {review.improvements.map((improvement, idx) => (
                  <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <Target className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                    {improvement}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recommendations */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('recommendations')}
              className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              <span className="font-medium text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                Recommendations ({review.recommendations.length})
              </span>
              {expandedSections.recommendations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSections.recommendations && (
              <ul className="p-3 space-y-3">
                {review.recommendations.map((rawRec, idx) => {
                  const rec = normalizeRecommendation(rawRec)
                  const recText = rec.text || String(rawRec)
                  const recId = rec.id || `rec-${idx}`
                  const priority = rec.priority || 'medium'
                  const priorityBadge = PRIORITY_BADGES[priority]
                  const isApplied = appliedRecommendationIds.includes(recId)
                  
                  return (
                    <li key={idx} className={`text-sm text-gray-700 dark:text-gray-300 p-2 rounded-lg border ${
                      isApplied ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'border-transparent'
                    }`}>
                      <div className="flex items-start gap-2">
                        {/* Priority Badge */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0 ${priorityBadge.color}`}>
                          {priorityBadge.emoji} {priorityBadge.label}
                        </span>
                        <div className="flex-1">
                          <span className={isApplied ? 'line-through opacity-70' : ''}>{recText}</span>
                          {rec.category && (
                            <span className="ml-2 text-xs text-gray-400">({rec.category})</span>
                          )}
                          {!isApplied && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`ml-2 h-6 text-xs ${
                                !canAddMoreInstructions ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              disabled={!canAddMoreInstructions}
                              onClick={() => {
                                appendInstruction(recText, recId)
                                setAppliedRecommendationPriorities(prev => ({ ...prev, [recId]: priority }))
                                setLeftPanelTab('scene')
                              }}
                            >
                              + Add to instructions
                            </Button>
                          )}
                          {isApplied && (
                            <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                              ✓ Applied
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    )
  }

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
            {/* Left: Tabbed Panel (Scene/Director/Audience) */}
            <div className="overflow-y-auto">
              <Tabs value={leftPanelTab} onValueChange={(v) => setLeftPanelTab(v as any)}>
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="scene" className="text-xs sm:text-sm">
                    Current Scene
                  </TabsTrigger>
                  <TabsTrigger value="director" className="text-xs sm:text-sm">
                    <Film className="w-3 h-3 mr-1 hidden sm:inline" />
                    Director {directorReview && <span className="ml-1 text-xs">({directorReview.overallScore})</span>}
                  </TabsTrigger>
                  <TabsTrigger value="audience" className="text-xs sm:text-sm">
                    <Users className="w-3 h-3 mr-1 hidden sm:inline" />
                    Audience {audienceReview && <span className="ml-1 text-xs">({audienceReview.overallScore})</span>}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="scene" className="mt-0">
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
                  <CurrentScenePanel scene={scene} />
                  
                  {/* Get Review Button */}
                  {!directorReview && !audienceReview && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Get AI Review
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 mb-3">
                            Analyze this scene from Director and Audience perspectives for improvement suggestions.
                          </p>
                          <Button
                            size="sm"
                            onClick={fetchSceneReview}
                            disabled={isLoadingReview}
                          >
                            {isLoadingReview ? (
                              <>
                                <Loader className="w-4 h-4 animate-spin mr-2" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Analyze Scene
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="director" className="mt-0">
                  <ReviewPanel review={directorReview} type="director" />
                </TabsContent>

                <TabsContent value="audience" className="mt-0">
                  <ReviewPanel review={audienceReview} type="audience" />
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Right: Instructions with Voice Input */}
            <div className="overflow-y-auto">
              <div className="space-y-4">
                <InstructionsPanel
                  instruction={customInstruction}
                  onInstructionChange={setCustomInstruction}
                />
                
                {/* Voice Input Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      Voice Input
                    </label>
                    {voiceSupported && isSecure && micPermission !== 'denied' && (
                      <Button
                        variant={isRecording ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={handleVoiceToggle}
                        className="gap-2"
                      >
                        {isRecording ? (
                          <>
                            <MicOff className="w-4 h-4" />
                            Stop Recording
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4" />
                            Start Recording
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {!voiceSupported && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      Voice input is not supported in this browser. Try Chrome or Edge.
                    </p>
                  )}
                  {voiceSupported && !isSecure && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      Voice input requires HTTPS. Please use a secure connection.
                    </p>
                  )}
                  {voiceSupported && isSecure && micPermission === 'denied' && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Microphone permission denied. Please enable it in your browser settings.
                    </p>
                  )}
                  {voiceError && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {voiceError}
                    </p>
                  )}
                  {isRecording && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm text-red-700 dark:text-red-300">
                        Listening... Speak your instructions
                      </span>
                    </div>
                  )}
                </div>

                {/* Preservation Options */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Preserve Elements
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preserveNarration}
                        onChange={(e) => setPreserveNarration(e.target.checked)}
                        className="rounded"
                      />
                      Narration
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preserveDialogue}
                        onChange={(e) => setPreserveDialogue(e.target.checked)}
                        className="rounded"
                      />
                      Dialogue
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
                        checked={preserveSfx}
                        onChange={(e) => setPreserveSfx(e.target.checked)}
                        className="rounded"
                      />
                      Sound Effects
                    </label>
                  </div>
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
                previewScene={previewScene}
                isGenerating={isGenerating}
                changes={[]}
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
                      disabled={!descriptionChanged}
                      className="bg-sf-primary"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Save Description
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    onClick={handleApplyChanges}
                    disabled={(!previewScene && !descriptionChanged) || isGenerating}
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
