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

import React, { useState, useCallback } from 'react'
import { Camera, Grid, List, RefreshCw, Edit, Loader, Printer, Clapperboard, Sparkles, Eye, X, Upload, Download, FolderPlus, ImagePlus, PenSquare, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useProcessWithOverlay } from '@/hooks/useProcessWithOverlay'
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal'
import { ReportType, StoryboardData } from '@/lib/types/reports'
import { SceneProductionManager } from './scene-production'
import { SceneProductionData, SceneProductionReferences } from './scene-production/types'
import { cn } from '@/lib/utils'
import { formatSceneHeading } from '@/lib/script/formatSceneHeading'

interface SceneGalleryProps {
  scenes: any[]
  characters: any[]
  projectTitle?: string
  onRegenerateScene: (sceneIndex: number) => void
  onOpenPromptBuilder?: (sceneIndex: number) => void
  onGenerateScene: (sceneIndex: number, prompt: string) => void
  onUploadScene: (sceneIndex: number, file: File) => void
  onDownloadScene?: (sceneIndex: number) => void
  onAddToLibrary?: (sceneIndex: number) => void
  onAddToSceneLibrary?: (sceneIndex: number, imageUrl: string) => void
  onClose?: () => void
  sceneProductionState: Record<string, SceneProductionData>
  productionReferences: SceneProductionReferences
  onInitializeProduction: (sceneId: string, options: { targetDuration: number }) => Promise<void>
  onSegmentPromptChange: (sceneId: string, segmentId: string, prompt: string) => void
  onSegmentGenerate: (sceneId: string, segmentId: string, mode: 'video' | 'image') => Promise<void>
  onSegmentUpload: (sceneId: string, segmentId: string, file: File) => Promise<void>
  onOpenAssets?: () => void
  onOpenPreview?: () => void
  /** Object/prop references from the reference library for consistent image generation */
  objectReferences?: Array<{ id: string; name: string; imageUrl: string; description?: string }>
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
}: SceneGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [selectedScene, setSelectedScene] = useState<number | null>(null)
  const [scenePrompts, setScenePrompts] = useState<Record<number, string>>({})
  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set())
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)
  const [openProductionScene, setOpenProductionScene] = useState<string | null>(null)
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  
  // Processing overlay hook for animated feedback
  const { execute } = useProcessWithOverlay()
  
  // Count scenes without images for Generate All button
  const scenesWithoutImages = scenes.filter(scene => !scene.imageUrl).length
  
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

  return (
    <TooltipProvider>
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-sf-primary" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-6 my-0">Scene Gallery and Production</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'}
          </span>
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
          {onOpenPreview && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenPreview}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-purple-300" />
              <span>Screening Room</span>
            </Button>
          )}
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
      
      {scenes.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Camera className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p>No scenes generated yet</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {scenes.map((scene, idx) => {
            const sceneKey = buildSceneKey(scene, idx)
            const defaultPrompt = buildScenePrompt(scene, idx)
            const productionData = sceneProductionState[sceneKey] ?? (scene.productionData as SceneProductionData | undefined)
            const isProductionOpen = openProductionScene === sceneKey
            return (
              <div
                key={sceneKey}
                className={cn('col-span-1', isProductionOpen && 'col-span-2 lg:col-span-3')}
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
                  onRegenerate={() => onRegenerateScene(idx)}
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
                />
              </div>
            )
          })}
        </div>
      ) : (
        <TimelineView 
          scenes={scenes}
          onSceneSelect={setSelectedScene}
          onRegenerateScene={onRegenerateScene}
        />
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
  onRegenerate: () => void
  onOpenPromptBuilder?: () => void
  onGenerate: (prompt: string) => void
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
  onSegmentGenerate: (sceneId: string, segmentId: string, mode: 'video' | 'image') => Promise<void>
  onSegmentUpload: (sceneId: string, segmentId: string, file: File) => Promise<void>
}

function SceneCard({
  sceneKey,
  scene,
  sceneNumber,
  isSelected,
  isProductionOpen,
  onClick,
  onRegenerate,
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
}: SceneCardProps) {
  const hasImage = !!scene.imageUrl
  const fileInputRef = React.useRef<HTMLInputElement>(null)
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
      
      {/* Generation Controls */}
      {!hasImage ? (
        <div className="absolute inset-x-2 bottom-14 p-2 bg-gradient-to-t from-black/90 to-transparent" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-1">
            <textarea 
              value={prompt}
              onChange={(e) => {
                onPromptChange(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              disabled={isGenerating}
              placeholder="Scene image prompt..."
              className="w-full text-xs px-2 py-1 rounded bg-gray-900/80 border border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ resize: 'vertical', minHeight: '2.5rem', maxHeight: '8rem' }}
              rows={2}
            />
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onGenerate(prompt); }}
                    disabled={isGenerating || !prompt.trim()}
                    className="flex-1 p-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Generate Scene Image</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className={`flex-1 p-2 rounded bg-gray-700 text-white text-center transition-colors flex items-center justify-center ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 cursor-pointer'}`}>
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isGenerating}
                      onChange={(e) => {
                        e.stopPropagation()
                        const file = e.target.files?.[0]
                        if (file) onUpload(file)
                      }}
                    />
                  </label>
                </TooltipTrigger>
                <TooltipContent>Upload Image</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
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
          
          {/* Edit Prompt / Regenerate */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (onOpenPromptBuilder) {
                    onOpenPromptBuilder();
                  } else {
                    onRegenerate();
                  }
                }}
                className="p-1.5 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {onOpenPromptBuilder ? (
                  <PenSquare className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{onOpenPromptBuilder ? 'Edit Prompt' : 'Regenerate'}</TooltipContent>
          </Tooltip>
          
          {/* Upload */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="p-1.5 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Upload className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Upload Image</TooltipContent>
          </Tooltip>
          
          {/* Download */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); onDownload ? onDownload() : handleDownload(); }}
                className="p-1.5 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Download className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
          
          {/* Add to Scene Reference Library */}
          {onAddToSceneLibrary && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddToSceneLibrary(); }}
                  className="p-1.5 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ImagePlus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Add to Scene Library</TooltipContent>
            </Tooltip>
          )}
          
          {/* Add to Character Library */}
          {onAddToLibrary && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddToLibrary(); }}
                  className="p-1.5 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <FolderPlus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Add to Character Library</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      
      {/* Character Indicators */}
      {scene.characters && scene.characters.length > 0 && (
        <div className="absolute top-2 left-2 flex gap-1">
          {scene.characters.slice(0, 3).map((charName: string, i: number) => (
            <div 
              key={i}
              className="w-6 h-6 rounded-full bg-white border-2 border-white overflow-hidden shadow-sm"
              title={charName}
            >
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                {charName[0]}
              </div>
            </div>
          ))}
        </div>
      )}

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

