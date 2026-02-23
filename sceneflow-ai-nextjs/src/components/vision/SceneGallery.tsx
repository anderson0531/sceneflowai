/**
 * SceneGallery - Visual storyboard display of scenes with images
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 * @see /CONTRIBUTING.md for development guidelines
 * 
 * RECEIVES: scenes from parent via props (sourced from script.script.scenes)
 * Do NOT maintain separate scene state - parent component is source of truth.
 * 
 * When generating/uploading images, the parent (Vision page) updates
 * script.script.scenes, which flows down to this component via props.
 */
'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Camera, Grid, List, RefreshCw, Edit, Loader, Printer, Clapperboard, Sparkles, Eye, EyeOff, X, Upload, Download, FolderPlus, ImagePlus, PenSquare, Wand2, Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, Check, Globe, Users, Package, AlertCircle, CheckCircle2, MapPin, FileText, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AudioGalleryPlayer } from './AudioGalleryPlayer'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useProcessWithOverlay } from '@/hooks/useProcessWithOverlay'
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal'
import { ReportType, StoryboardData } from '@/lib/types/reports'
import { SceneProductionManager } from './scene-production'
import { SceneProductionData, SceneProductionReferences } from './scene-production/types'
import { GenerationType } from './scene-production/SegmentStudio'
import { VideoGenerationMethod } from './scene-production/SegmentPromptBuilder'
import { cn } from '@/lib/utils'
import { formatSceneHeading, extractLocation } from '@/lib/script/formatSceneHeading'
import { ImageEditModal } from './ImageEditModal'

interface SceneGalleryProps {
  scenes: any[]
  characters: any[]
  projectTitle?: string
  onRegenerateScene: (sceneIndex: number) => void | Promise<void>
  onOpenPromptBuilder?: (sceneIndex: number) => void
  onGenerateScene: (sceneIndex: number, prompt: string) => void | Promise<void>
  onUploadScene: (sceneIndex: number, file: File) => void
  onDownloadScene?: (sceneIndex: number) => void
  onAddToLibrary?: (sceneIndex: number) => void
  onAddToSceneLibrary?: (sceneIndex: number, imageUrl: string) => void
  onClose?: () => void
  sceneProductionState: Record<string, SceneProductionData>
  productionReferences: SceneProductionReferences
  onInitializeProduction: (sceneId: string, options: { targetDuration: number }) => Promise<void>
  onSegmentPromptChange: (sceneId: string, segmentId: string, prompt: string) => void
  onSegmentGenerate: (sceneId: string, segmentId: string, mode: GenerationType, options?: {
    startFrameUrl?: string
    endFrameUrl?: string
    referenceImages?: Array<{ url: string; type: 'style' | 'character' }>
    generationMethod?: VideoGenerationMethod
    prompt?: string
    negativePrompt?: string
    duration?: number
    aspectRatio?: '16:9' | '9:16'
    resolution?: '720p' | '1080p'
    sourceVideoUrl?: string
    guidePrompt?: string
  }) => Promise<void>
  onSegmentUpload: (sceneId: string, segmentId: string, file: File) => Promise<void>
  onOpenAssets?: () => void
  onOpenPreview?: () => void
  /** Object/prop references from the reference library for consistent image generation */
  objectReferences?: Array<{ id: string; name: string; imageUrl: string; description?: string }>
  /** Callback to open Generate Audio dialog */
  onOpenGenerateAudio?: () => void
  /** Whether audio generation is currently in progress */
  isGeneratingAudio?: boolean
  /** Callback to pin a storyboard image as a location reference */
  onPinAsLocationReference?: (sceneIndex: number, imageUrl: string, sceneHeading: string) => void
  /** Set of location names that are already pinned */
  pinnedLocations?: Set<string>
  /** Callback when an edited image is saved */
  onSaveEditedScene?: (sceneIndex: number, newImageUrl: string) => void
  /** Callback to reorder scenes (drag and drop) */
  onReorderScenes?: (startIndex: number, endIndex: number) => void
}

const buildSceneKey = (scene: any, index: number) => scene.sceneId || scene.id || `scene-${index}`

export function SceneGallery({
  scenes,
  characters,
  projectTitle,
  onRegenerateScene,
  onOpenPromptBuilder,
  onGenerateScene,
  onUploadScene,
  onDownloadScene,
  onAddToLibrary,
  onAddToSceneLibrary,
  onClose,
  sceneProductionState,
  productionReferences,
  onInitializeProduction,
  onSegmentPromptChange,
  onSegmentGenerate,
  onSegmentUpload,
  onOpenAssets,
  onOpenPreview,
  objectReferences,
  onOpenGenerateAudio,
  isGeneratingAudio = false,
  onPinAsLocationReference,
  pinnedLocations,
  onSaveEditedScene,
  onReorderScenes,
}: SceneGalleryProps) {
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end for scene reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(String(active.id))
      const newIndex = parseInt(String(over.id))
      onReorderScenes?.(oldIndex, newIndex)
    }
  }

  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [selectedScene, setSelectedScene] = useState<number | null>(null)
  const [scenePrompts, setScenePrompts] = useState<Record<number, string>>({})
  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set())
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)
  const [openProductionScene, setOpenProductionScene] = useState<string | null>(null)
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [showAudioPlayer, setShowAudioPlayer] = useState(false)
  const [showStoryboardImages, setShowStoryboardImages] = useState(true)
  const [isGeneratingDirection, setIsGeneratingDirection] = useState(false)
  const [directionProgress, setDirectionProgress] = useState<{ current: number; total: number } | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null)
  const [editingSceneImageUrl, setEditingSceneImageUrl] = useState<string>('')
  
  // Count scenes with audio for Generate All Audio button display
  const scenesWithAudio = useMemo(() => {
    return scenes.filter(scene => 
      scene.narrationAudio?.en?.url || 
      scene.narrationAudioUrl || 
      (scene.dialogueAudio?.en && scene.dialogueAudio.en.length > 0)
    ).length
  }, [scenes])
  
  const scenesWithoutAudio = scenes.length - scenesWithAudio
  
  // Detect available languages across all scenes
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>()
    scenes.forEach(scene => {
      if (scene.narrationAudio) {
        Object.keys(scene.narrationAudio).forEach(lang => {
          if (scene.narrationAudio[lang]?.url) langs.add(lang)
        })
      }
      if (scene.dialogueAudio) {
        Object.keys(scene.dialogueAudio).forEach(lang => {
          if (Array.isArray(scene.dialogueAudio[lang]) && scene.dialogueAudio[lang].length > 0) langs.add(lang)
        })
      }
    })
    if (langs.size === 0) langs.add('en')
    return Array.from(langs).sort()
  }, [scenes])
  
  // Processing overlay hook for animated feedback
  const { execute } = useProcessWithOverlay()
  
  // Count scenes without images for Generate All button
  const scenesWithoutImages = scenes.filter(scene => !scene.imageUrl).length
  
  // Count scenes without direction for Generate Direction button
  const scenesWithoutDirection = scenes.filter(scene => !scene.sceneDirection || Object.keys(scene.sceneDirection).length === 0).length
  
  // Build smart prompt that includes character AND object references for consistency
  const buildScenePrompt = useCallback((scene: any, sceneIdx: number): string => {
    const savedPrompt = scene.imagePrompt
    if (savedPrompt) return savedPrompt
    
    const baseParts = [
      scene.heading,
      scene.visualDescription || scene.action || scene.summary,
    ].filter(Boolean)
    
    // Add character references if they're in this scene
    if (scene.characters && scene.characters.length > 0) {
      const sceneChars = characters.filter(char => 
        scene.characters.some((name: string) => 
          char.name?.toLowerCase() === name?.toLowerCase()
        )
      )
      
      if (sceneChars.length > 0) {
        const charDescriptions = sceneChars.map(char => {
          const desc = char.imagePrompt || char.description || ''
          const refNote = char.referenceImageUrl ? ' [use reference image for consistency]' : ''
          return `${char.name}: ${desc}${refNote}`
        }).join('; ')
        
        baseParts.push(`Characters: ${charDescriptions}`)
      }
    }
    
    // Add object/prop references if they're mentioned in the scene text
    if (objectReferences && objectReferences.length > 0) {
      const sceneText = `${scene.heading || ''} ${scene.visualDescription || ''} ${scene.action || ''} ${scene.summary || ''}`.toLowerCase()
      const matchedObjects = objectReferences.filter(obj => 
        sceneText.includes(obj.name.toLowerCase())
      )
      
      if (matchedObjects.length > 0) {
        const objDescriptions = matchedObjects.map(obj => {
          const desc = obj.description || obj.name
          return `${obj.name}: ${desc} [use reference image for consistency]`
        }).join('; ')
        
        baseParts.push(`Props/Objects: ${objDescriptions}`)
      }
    }
    
    return baseParts.join('. ')
  }, [characters, objectReferences])
  
  // Generate all scenes that don't have images - with processing overlay
  const handleGenerateAll = useCallback(async () => {
    if (scenesWithoutImages === 0) return
    
    setIsGeneratingAll(true)
    
    try {
      await execute(async () => {
        // Generate each scene sequentially
        for (let idx = 0; idx < scenes.length; idx++) {
          const scene = scenes[idx]
          if (scene.imageUrl) continue // Skip scenes with images
          
          const prompt = buildScenePrompt(scene, idx)
          setGeneratingScenes(prev => new Set(prev).add(idx))
          
          try {
            await onGenerateScene(idx, prompt)
          } catch (err) {
            console.error(`[SceneGallery] Failed to generate scene ${idx + 1}:`, err)
          } finally {
            setGeneratingScenes(prev => {
              const newSet = new Set(prev)
              newSet.delete(idx)
              return newSet
            })
          }
        }
      }, {
        message: `Generating ${scenesWithoutImages} scene images...`,
        estimatedDuration: scenesWithoutImages * 15, // ~15s per image
        operationType: 'image-generation'
      })
    } finally {
      setIsGeneratingAll(false)
    }
  }, [scenes, scenesWithoutImages, buildScenePrompt, onGenerateScene, execute])
  
  // Generate direction for all scenes - streaming with progress
  const handleGenerateAllDirection = useCallback(async () => {
    if (scenesWithoutDirection === 0) return
    
    setIsGeneratingDirection(true)
    setDirectionProgress({ current: 0, total: scenesWithoutDirection })
    
    try {
      // Get projectId from first scene or URL
      const projectId = scenes[0]?.projectId || window.location.pathname.split('/').pop()
      
      const response = await fetch('/api/vision/generate-all-direction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      })
      
      if (!response.body) throw new Error('No response body')
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'progress') {
                setDirectionProgress({ current: data.scene, total: data.total })
              } else if (data.type === 'scene-complete') {
                setDirectionProgress({ current: data.scene, total: data.total })
              } else if (data.type === 'complete') {
                console.log(`[SceneGallery] Direction generation complete: ${data.generated} generated, ${data.skipped} skipped, ${data.failed} failed`)
              } else if (data.type === 'error') {
                console.error('[SceneGallery] Direction generation error:', data.error)
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
      
      // Trigger page refresh to show updated directions
      window.location.reload()
    } catch (error) {
      console.error('[SceneGallery] Failed to generate all directions:', error)
    } finally {
      setIsGeneratingDirection(false)
      setDirectionProgress(null)
    }
  }, [scenes, scenesWithoutDirection])

  return (
    <TooltipProvider>
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-sf-primary" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-6 my-0">Storyboard</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'}
          </span>
          {/* Audio status indicator */}
          {scenesWithAudio > 0 && (
            <span className="text-xs text-emerald-500 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              {scenesWithAudio}/{scenes.length} audio
            </span>
          )}
        </div>
        
        <div className="flex gap-2 items-center">
          {/* Generate All button - only show if scenes without images exist */}
          {scenesWithoutImages > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAll}
                  disabled={isGeneratingAll || generatingScenes.size > 0}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30 hover:border-indigo-500/50 hover:from-indigo-500/20 hover:to-purple-500/20"
                >
                  {isGeneratingAll ? (
                    <Loader className="w-4 h-4 animate-spin text-indigo-400" />
                  ) : (
                    <Wand2 className="w-4 h-4 text-indigo-400" />
                  )}
                  <span>Generate All ({scenesWithoutImages})</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate images for all scenes without images</TooltipContent>
            </Tooltip>
          )}
          {/* Generate All Direction button - only show if scenes without direction exist */}
          {scenesWithoutDirection > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAllDirection}
                  disabled={isGeneratingDirection}
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-500/50 hover:from-amber-500/20 hover:to-orange-500/20"
                >
                  {isGeneratingDirection ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin text-amber-400" />
                      <span>{directionProgress ? `${directionProgress.current}/${directionProgress.total}` : 'Generating...'}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>Generate Direction ({scenesWithoutDirection})</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate scene direction for all scenes without direction</TooltipContent>
            </Tooltip>
          )}
          {/* Generate All Audio button */}
          {onOpenGenerateAudio && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenGenerateAudio}
                  disabled={isGeneratingAudio}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30 hover:border-emerald-500/50 hover:from-emerald-500/20 hover:to-teal-500/20"
                >
                  {isGeneratingAudio ? (
                    <Loader className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Generate Audio</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate narration and dialogue audio for all scenes</TooltipContent>
            </Tooltip>
          )}
          {/* Audio Player toggle - only show if scenes have audio */}
          {scenesWithAudio > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showAudioPlayer ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAudioPlayer(!showAudioPlayer)}
                  className={showAudioPlayer 
                    ? "flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" 
                    : "flex items-center gap-2"
                  }
                >
                  {showAudioPlayer ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>Player</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showAudioPlayer ? 'Hide player' : 'Show player to preview scene audio'}</TooltipContent>
            </Tooltip>
          )}
          {/* Storyboard Images toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStoryboardImages(!showStoryboardImages)}
                className={showStoryboardImages 
                  ? "flex items-center gap-2" 
                  : "flex items-center gap-2 bg-gray-200 dark:bg-gray-700"
                }
              >
                {showStoryboardImages ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="hidden sm:inline">Images</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showStoryboardImages ? 'Hide storyboard images' : 'Show storyboard images'}</TooltipContent>
          </Tooltip>
          {scenes.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReportPreviewOpen(true)}
                  className="flex items-center justify-center"
                >
                  <Printer className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Print Storyboard</TooltipContent>
            </Tooltip>
          )}
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-800 text-sf-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            title="Grid view"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('timeline')}
            className={`p-2 rounded transition-colors ${viewMode === 'timeline' ? 'bg-gray-100 dark:bg-gray-800 text-sf-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            title="Timeline view"
          >
            <List className="w-4 h-4" />
          </button>
          {onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onClose}
                  className="p-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Close Storyboard</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      
      {/* Audio Gallery Player - collapsible section */}
      {showAudioPlayer && scenesWithAudio > 0 && (
        <div className="mb-6">
          <AudioGalleryPlayer
            scenes={scenes}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            availableLanguages={availableLanguages}
            onClose={() => setShowAudioPlayer(false)}
          />
        </div>
      )}
      
      {/* Storyboard Images section - collapsible */}
      {showStoryboardImages && (
        <>
      {scenes.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Camera className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p>No scenes generated yet</p>
        </div>
      ) : viewMode === 'grid' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={scenes.map((_, idx) => idx)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {scenes.map((scene, idx) => {
                const sceneKey = buildSceneKey(scene, idx)
                const defaultPrompt = buildScenePrompt(scene, idx)
                const productionData = sceneProductionState[sceneKey] ?? (scene.productionData as SceneProductionData | undefined)
                const isProductionOpen = openProductionScene === sceneKey
                return (
                  <SortableSceneWrapper
                    key={sceneKey}
                    id={idx}
                    isProductionOpen={isProductionOpen}
                    disabled={!onReorderScenes}
                  >
                    <SceneCard
                  sceneKey={sceneKey}
                  scene={scene}
                  sceneNumber={idx + 1}
                  isSelected={selectedScene === idx}
                  isProductionOpen={isProductionOpen}
                  onToggleProduction={() =>
                    setOpenProductionScene(isProductionOpen ? null : sceneKey)
                  }
                  onClick={() => {
                    setSelectedScene(idx)
                    setOpenProductionScene(isProductionOpen ? null : sceneKey)
                  }}
                  onRegenerate={async () => {
                    setGeneratingScenes((prev) => new Set(prev).add(idx))
                    try {
                      await execute(async () => {
                        await onRegenerateScene(idx)
                      }, {
                        message: `Generating new image for Scene ${idx + 1}...`,
                        estimatedDuration: 15,
                        operationType: 'image-generation'
                      })
                    } finally {
                      setGeneratingScenes((prev) => {
                        const newSet = new Set(prev)
                        newSet.delete(idx)
                        return newSet
                      })
                    }
                  }}
                  onEdit={() => {
                    if (scene.imageUrl) {
                      setEditingSceneIndex(idx)
                      setEditingSceneImageUrl(scene.imageUrl)
                      setEditModalOpen(true)
                    }
                  }}
                  onOpenPromptBuilder={onOpenPromptBuilder ? () => onOpenPromptBuilder(idx) : undefined}
                  onGenerate={async (prompt) => {
                    setGeneratingScenes((prev) => new Set(prev).add(idx))
                    try {
                      await execute(async () => {
                        await onGenerateScene(idx, prompt)
                      }, {
                        message: `Generating image for Scene ${idx + 1}...`,
                        estimatedDuration: 15,
                        operationType: 'image-generation'
                      })
                    } finally {
                      setGeneratingScenes((prev) => {
                        const newSet = new Set(prev)
                        newSet.delete(idx)
                        return newSet
                      })
                    }
                  }}
                  onUpload={(file) => onUploadScene(idx, file)}
                  onDownload={onDownloadScene ? () => onDownloadScene(idx) : undefined}
                  onAddToLibrary={onAddToLibrary ? () => onAddToLibrary(idx) : undefined}
                  onAddToSceneLibrary={onAddToSceneLibrary && scene.imageUrl ? () => onAddToSceneLibrary(idx, scene.imageUrl) : undefined}
                  prompt={scenePrompts[idx] || defaultPrompt}
                  onPromptChange={(prompt) => setScenePrompts((prev) => ({ ...prev, [idx]: prompt }))}
                  isGenerating={generatingScenes.has(idx)}
                  productionData={productionData}
                  productionReferences={productionReferences}
                  onInitializeProduction={onInitializeProduction}
                  onSegmentPromptChange={onSegmentPromptChange}
                  onSegmentGenerate={onSegmentGenerate}
                  onSegmentUpload={onSegmentUpload}
                  characters={characters}
                  objectReferences={objectReferences}
                  onPinAsLocationReference={onPinAsLocationReference && scene.imageUrl ? () => {
                    const sceneHeading = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text
                    onPinAsLocationReference(idx, scene.imageUrl, sceneHeading || '')
                  } : undefined}
                  isLocationPinned={(() => {
                    if (!pinnedLocations) return false
                    const sceneHeading = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text
                    const location = extractLocation(sceneHeading)
                    return location ? pinnedLocations.has(location) : false
                  })()}
                  showDragHandle={!!onReorderScenes}
                />
                  </SortableSceneWrapper>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <TimelineView 
          scenes={scenes}
          onSceneSelect={setSelectedScene}
          onRegenerateScene={onRegenerateScene}
        />
      )}
        </>
      )}
      
      {/* Storyboard Report Preview Modal */}
      {scenes.length > 0 && (
        <ReportPreviewModal
          type={ReportType.STORYBOARD}
          data={{
            title: projectTitle || 'Untitled Project',
            frames: scenes.map((scene, idx) => ({
              sceneNumber: idx + 1,
              imageUrl: scene.imageUrl,
              visualDescription: scene.visualDescription || scene.action || scene.summary,
              shotType: scene.shotType,
              cameraAngle: scene.cameraAngle,
              lighting: scene.lighting,
              duration: scene.duration
            }))
          } as StoryboardData}
          projectName={projectTitle || 'Untitled Project'}
          open={reportPreviewOpen}
          onOpenChange={setReportPreviewOpen}
        />
      )}
      
      {/* Image Edit Modal */}
      <ImageEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        imageUrl={editingSceneImageUrl}
        imageType="scene"
        objectReferences={objectReferences}
        onSave={(newImageUrl) => {
          if (editingSceneIndex !== null && onSaveEditedScene) {
            onSaveEditedScene(editingSceneIndex, newImageUrl)
          }
          setEditModalOpen(false)
          setEditingSceneIndex(null)
        }}
        title={editingSceneIndex !== null ? `Edit Scene ${editingSceneIndex + 1}` : 'Edit Scene'}
      />
    </div>
    </TooltipProvider>
  )
}

interface SceneCardProps {
  sceneKey: string
  scene: any
  sceneNumber: number
  isSelected: boolean
  isProductionOpen: boolean
  onClick: () => void
  onRegenerate: () => Promise<void>
  onEdit?: () => void
  onOpenPromptBuilder?: () => void
  onGenerate: (prompt: string) => Promise<void>
  onUpload: (file: File) => void
  onDownload?: () => void
  onAddToLibrary?: () => void
  onAddToSceneLibrary?: () => void
  prompt: string
  onPromptChange: (prompt: string) => void
  isGenerating: boolean
  onToggleProduction: () => void
  productionData?: SceneProductionData
  productionReferences: SceneProductionReferences
  onInitializeProduction: (sceneId: string, options: { targetDuration: number }) => Promise<void>
  onSegmentPromptChange: (sceneId: string, segmentId: string, prompt: string) => void
  onSegmentGenerate: (sceneId: string, segmentId: string, mode: GenerationType, options?: {
    startFrameUrl?: string
    endFrameUrl?: string
    referenceImages?: Array<{ url: string; type: 'style' | 'character' }>
    generationMethod?: VideoGenerationMethod
    prompt?: string
    negativePrompt?: string
    duration?: number
    aspectRatio?: '16:9' | '9:16'
    resolution?: '720p' | '1080p'
    sourceVideoUrl?: string
    guidePrompt?: string
  }) => Promise<void>
  onSegmentUpload: (sceneId: string, segmentId: string, file: File) => Promise<void>
  /** All project characters for reference status checking */
  characters?: any[]
  /** Object/prop references from reference library */
  objectReferences?: Array<{ id: string; name: string; imageUrl: string; description?: string }>
  /** Callback to pin the storyboard image as a location reference */
  onPinAsLocationReference?: () => void
  /** Whether this location is already pinned */
  isLocationPinned?: boolean
  /** Whether to show the drag handle for reordering */
  showDragHandle?: boolean
}

// Sortable wrapper component for drag-and-drop
function SortableSceneWrapper({ 
  id, 
  children, 
  isProductionOpen,
  disabled = false
}: { 
  id: number
  children: React.ReactNode
  isProductionOpen: boolean
  disabled?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('col-span-1', isProductionOpen && 'col-span-2 lg:col-span-3')}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

function SceneCard({
  sceneKey,
  scene,
  sceneNumber,
  isSelected,
  isProductionOpen,
  onClick,
  onRegenerate,
  onEdit,
  onOpenPromptBuilder,
  onGenerate,
  onUpload,
  onDownload,
  onAddToLibrary,
  onAddToSceneLibrary,
  prompt,
  onPromptChange,
  isGenerating,
  onToggleProduction,
  productionData,
  productionReferences,
  onInitializeProduction,
  onSegmentPromptChange,
  onSegmentGenerate,
  onSegmentUpload,
  characters = [],
  objectReferences = [],
  onPinAsLocationReference,
  isLocationPinned = false,
  showDragHandle = false,
}: SceneCardProps) {
  const hasImage = !!scene.imageUrl
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  
  // Compute reference status for this scene
  const referenceStatus = useMemo(() => {
    const sceneCharacterNames: string[] = scene.characters || []
    const sceneCharacters = sceneCharacterNames
      .map(name => characters.find(c => c.name === name))
      .filter(Boolean)
    
    const charsWithRef = sceneCharacters.filter(c => c?.referenceImage)
    const charsWithoutRef = sceneCharacters.filter(c => !c?.referenceImage)
    
    // Check for props mentioned in scene that have references
    const sceneText = `${scene.action || ''} ${scene.visualDescription || ''} ${scene.narration || ''}`.toLowerCase()
    const matchingProps = objectReferences.filter(obj => 
      sceneText.includes(obj.name.toLowerCase())
    )
    
    return {
      totalChars: sceneCharacters.length,
      charsWithRef: charsWithRef.length,
      charsWithoutRef: charsWithoutRef.length,
      charsMissingRef: charsWithoutRef.map(c => c?.name).filter(Boolean),
      hasAllCharRefs: sceneCharacters.length === 0 || charsWithRef.length === sceneCharacters.length,
      propsAvailable: matchingProps.length,
      isReady: sceneCharacters.length === 0 || charsWithRef.length === sceneCharacters.length,
    }
  }, [scene, characters, objectReferences])
  
  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('[data-scene-production]')) {
      return
    }
    onClick()
  }
  
  const handleDownload = () => {
    if (scene.imageUrl) {
      const link = document.createElement('a')
      link.href = scene.imageUrl
      link.download = `scene-${sceneNumber}.png`
      link.click()
    }
  }
  
  const sceneHeading = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text
  const formattedHeading = formatSceneHeading(sceneHeading) || sceneHeading || 'Untitled'
  return (
    <div 
      onClick={handleCardClick}
      className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all ${
        isSelected 
          ? 'border-sf-primary ring-2 ring-sf-primary' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {/* Drag Handle Indicator */}
      {showDragHandle && (
        <div 
          className="absolute top-2 left-2 p-1.5 bg-black/50 rounded cursor-grab hover:bg-black/70 transition-colors z-20 opacity-0 group-hover:opacity-100"
          title="Drag to reorder scenes"
        >
          <GripVertical className="w-4 h-4 text-white/80" />
        </div>
      )}

      {/* Scene Image */}
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
        {scene.imageUrl ? (
          <img 
            src={scene.imageUrl} 
            alt={`Scene ${sceneNumber}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Camera className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <span className="text-xs text-gray-500 dark:text-gray-400">No image</span>
          </div>
        )}
        
        {/* Prominent loading overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-10">
            <Loader className="w-12 h-12 animate-spin text-blue-400 mb-3" />
            <span className="text-sm text-white font-medium">Generating Scene...</span>
            <span className="text-xs text-gray-300 mt-1">Please wait</span>
          </div>
        )}
      </div>
      
      {/* Scene Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="text-white">
          <div className="text-xs font-semibold">SCENE {sceneNumber}</div>
          <div className="text-sm truncate">{formattedHeading}</div>
        </div>
      </div>
      
      {/* Unified Hover Controls - same for both empty and populated states */}
      <div className={`absolute inset-0 bg-black/40 transition-opacity rounded-t-lg flex items-center justify-center gap-3 ${hasImage ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
        {/* Hidden file input for upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(file)
          }}
        />
        
        {/* Generate image (Sparkles - indigo) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                if (onOpenPromptBuilder) {
                  onOpenPromptBuilder();
                } else {
                  onGenerate(prompt);
                }
              }}
              disabled={isGenerating}
              className="p-3 bg-indigo-600/80 hover:bg-indigo-600 rounded-full transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>{hasImage ? 'Generate New Image' : 'Generate Scene Image'}</TooltipContent>
        </Tooltip>
        
        {/* Edit image (Wand2 - purple) - only show if has image */}
        {hasImage && onEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-3 bg-purple-600/80 hover:bg-purple-600 rounded-full transition-colors"
              >
                <Wand2 className="w-5 h-5 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Edit Image</TooltipContent>
          </Tooltip>
        )}
        
        {/* Upload Scene Image (Upload - emerald) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="p-3 bg-emerald-600/80 hover:bg-emerald-600 rounded-full transition-colors"
            >
              <Upload className="w-5 h-5 text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Upload Image</TooltipContent>
        </Tooltip>
        
        {/* Pin as Location Reference (MapPin - cyan) - only show if has image */}
        {hasImage && onPinAsLocationReference && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); onPinAsLocationReference(); }}
                className={`p-3 rounded-full transition-colors ${
                  isLocationPinned 
                    ? 'bg-cyan-500 ring-2 ring-cyan-300' 
                    : 'bg-cyan-600/80 hover:bg-cyan-600'
                }`}
              >
                <MapPin className="w-5 h-5 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isLocationPinned ? 'Location Already Pinned' : 'Pin as Location Reference'}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      
      {/* Reference Status Indicator - Top Right */}
      {referenceStatus.totalChars > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${
              referenceStatus.hasAllCharRefs 
                ? 'bg-emerald-500/90 text-white' 
                : 'bg-amber-500/90 text-white'
            }`}>
              <Users className="w-3 h-3" />
              <span>{referenceStatus.charsWithRef}/{referenceStatus.totalChars}</span>
              {referenceStatus.hasAllCharRefs ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[200px]">
            {referenceStatus.hasAllCharRefs ? (
              <span>All {referenceStatus.totalChars} character reference{referenceStatus.totalChars > 1 ? 's' : ''} ready</span>
            ) : (
              <div>
                <div className="font-medium text-amber-400">Missing references:</div>
                <div className="text-xs">{referenceStatus.charsMissingRef.join(', ')}</div>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      )}
      
      {/* Character Avatars - Top Left */}
      {scene.characters && scene.characters.length > 0 && (
        <div className="absolute top-2 left-2 flex gap-1">
          {scene.characters.slice(0, 3).map((charName: string, i: number) => {
            const char = characters.find(c => c.name === charName)
            const hasRef = char?.referenceImage
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div 
                    className={`w-6 h-6 rounded-full overflow-hidden shadow-sm border-2 ${
                      hasRef ? 'border-emerald-400' : 'border-amber-400'
                    }`}
                  >
                    {hasRef ? (
                      <img src={char.referenceImage} alt={charName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                        {charName[0]}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {charName}{hasRef ? '' : ' (no reference)'}
                </TooltipContent>
              </Tooltip>
            )
          })}
          {scene.characters.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center text-[10px] text-gray-300">
              +{scene.characters.length - 3}
            </div>
          )}
        </div>
      )}
      
      {/* Audio Status Indicator */}
      {(() => {
        const hasNarration = scene.narrationAudio?.en?.url || scene.narrationAudioUrl
        const hasDialogue = scene.dialogueAudio?.en && scene.dialogueAudio.en.length > 0
        const hasMusic = scene.musicAudio || scene.music?.url
        const hasSfx = scene.sfxAudio && scene.sfxAudio.length > 0
        const hasAnyAudio = hasNarration || hasDialogue || hasMusic || hasSfx
        
        if (!hasAnyAudio) return null
        
        return (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1">
            <Volume2 className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-white font-medium">
              {[
                hasNarration && 'VO',
                hasDialogue && 'DLG',
                hasMusic && '♪',
                hasSfx && 'SFX'
              ].filter(Boolean).join(' · ')}
            </span>
          </div>
        )
      })()}

      <div
        data-scene-production
        className="mt-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/80 backdrop-blur-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onToggleProduction}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100"
        >
          <span className="flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-sf-primary" />
            <span className="truncate">SCENE {sceneNumber}: {(() => {
              // Extract simplified location from heading (remove INT/EXT prefix)
              const heading = sceneHeading || ''
              const simplified = heading.replace(/^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?)\s*/i, '').trim()
              return simplified || 'Untitled'
            })()}</span>
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
            {isProductionOpen ? 'Hide' : 'Expand'}
          </span>
        </button>
        {isProductionOpen ? (
          <div className="px-4 pb-4">
            <SceneProductionManager
              sceneId={sceneKey}
              sceneNumber={sceneNumber}
              heading={sceneHeading}
              scene={scene}
              productionData={productionData}
              references={productionReferences}
              onInitialize={onInitializeProduction}
              onPromptChange={onSegmentPromptChange}
              onGenerate={onSegmentGenerate}
              onUpload={onSegmentUpload}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

interface TimelineViewProps {
  scenes: any[]
  onSceneSelect: (index: number) => void
  onRegenerateScene: (index: number) => void
}

function TimelineView({ scenes, onSceneSelect, onRegenerateScene }: TimelineViewProps) {
  return (
    <div className="space-y-4">
      {scenes.map((scene, idx) => (
        <div
          key={idx}
          className="flex gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-all"
          onClick={() => onSceneSelect(idx)}
        >
          <div className="w-32 h-20 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
            {scene.imageUrl ? (
              <img src={scene.imageUrl} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-500">SCENE {idx + 1}</span>
              {scene.duration && (
                <span className="text-xs text-gray-400">{scene.duration}s</span>
              )}
            </div>
            {scene.heading && (
              <div className="font-semibold text-sm text-gray-900 mb-1">{scene.heading}</div>
            )}
            {scene.action && (
              <p className="text-sm text-gray-600 line-clamp-2">{scene.action}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

