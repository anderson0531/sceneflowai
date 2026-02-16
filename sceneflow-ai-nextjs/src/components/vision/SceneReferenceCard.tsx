/**
 * SceneReferenceCard - Individual scene reference card for Production Bible Scene tab
 * 
 * Scene references are environment-only shots WITHOUT actors, intended for
 * production consistency across image and video generation.
 * 
 * Features:
 * - Compact icon-based status indicators (direction/image ready)
 * - Expand image control for full-size preview
 * - Hover controls for generate/edit/upload/save
 * - Tooltip-based info display to avoid text overlay clutter
 */
'use client'

import React, { useRef, useMemo, useState } from 'react'
import { 
  Camera, 
  Sparkles, 
  Wand2, 
  Upload, 
  Loader, 
  CheckCircle2, 
  AlertCircle,
  FolderPlus,
  MapPin,
  Lightbulb,
  Maximize2,
  X,
  Image as ImageIcon
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DetailedSceneDirection } from '@/types/scene-direction'
import { formatSceneHeading } from '@/lib/script/formatSceneHeading'

export interface SceneReferenceCardProps {
  /** Scene data object */
  scene: {
    id?: string
    sceneId?: string
    heading?: string | { text?: string }
    visualDescription?: string
    action?: string
    summary?: string
    sceneDirection?: DetailedSceneDirection
    sceneReferenceImageUrl?: string
    imageUrl?: string
  }
  /** 1-based scene number */
  sceneNumber: number
  /** Whether this card is currently selected */
  isSelected?: boolean
  /** Whether generation is in progress for this scene */
  isGenerating?: boolean
  /** Callback when Generate button clicked */
  onGenerate: () => void
  /** Callback when Edit button clicked (for existing image) */
  onEdit?: () => void
  /** Callback when file uploaded */
  onUpload: (file: File) => void
  /** Callback to save image to Reference Library */
  onSaveToLibrary?: () => void
  /** Callback when Generate Direction button clicked (fallback when no direction exists) */
  onGenerateDirection?: () => void
  /** Whether scene direction generation is in progress */
  isGeneratingDirection?: boolean
  /** Click handler for the card */
  onClick?: () => void
}

export function SceneReferenceCard({
  scene,
  sceneNumber,
  isSelected = false,
  isGenerating = false,
  onGenerate,
  onEdit,
  onUpload,
  onSaveToLibrary,
  onGenerateDirection,
  isGeneratingDirection = false,
  onClick,
}: SceneReferenceCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Scene reference image only - NO fallback to storyboard image (imageUrl)
  const sceneRefImageUrl = scene.sceneReferenceImageUrl
  const hasImage = !!sceneRefImageUrl
  const hasSceneDirection = !!scene.sceneDirection
  
  // Extract key info from scene direction for tooltip display
  const directionSummary = useMemo(() => {
    if (!scene.sceneDirection) return null
    const sd = scene.sceneDirection
    return {
      location: sd.scene?.location || null,
      atmosphere: sd.scene?.atmosphere || null,
      keyProps: sd.scene?.keyProps || [],
      mood: sd.lighting?.overallMood || null,
      timeOfDay: sd.lighting?.timeOfDay || null,
    }
  }, [scene.sceneDirection])
  
  const sceneHeading = typeof scene.heading === 'string' 
    ? scene.heading 
    : scene.heading?.text
  const formattedHeading = formatSceneHeading(sceneHeading) || sceneHeading || 'Untitled'
  
  // Can only generate if scene direction exists
  const canGenerate = hasSceneDirection && !isGenerating && !isGeneratingDirection
  
  return (
    <>
      <div 
        onClick={onClick}
        className={`group relative rounded-lg border overflow-hidden transition-all ${
          isSelected 
            ? 'border-cyan-500 ring-2 ring-cyan-500' 
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        } ${onClick ? 'cursor-pointer' : ''}`}
      >
        {/* Scene Reference Image */}
        <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
          {hasImage ? (
            <img 
              src={sceneRefImageUrl} 
              alt={`Scene ${sceneNumber} Reference`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <MapPin className="w-6 h-6 text-gray-400 dark:text-gray-600 mb-1" />
              <span className="text-[10px] text-gray-500 dark:text-gray-400">No reference</span>
            </div>
          )}
          
          {/* Loading overlay */}
          {(isGenerating || isGeneratingDirection) && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-10">
              <Loader className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
              <span className="text-xs text-white">
                {isGeneratingDirection ? 'Direction...' : 'Reference...'}
              </span>
            </div>
          )}
        </div>
        
        {/* Compact Bottom Bar - Scene number + status icons */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-2 py-1.5">
          <div className="flex items-center justify-between">
            {/* Scene number with heading tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-white cursor-default">
                  <Camera className="w-3 h-3 text-cyan-400" />
                  <span className="text-[11px] font-semibold">S{sceneNumber}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <div className="text-xs">
                  <div className="font-medium">{formattedHeading}</div>
                  {directionSummary && (
                    <div className="mt-1 text-gray-400 space-y-0.5">
                      {directionSummary.location && <div>📍 {directionSummary.location}</div>}
                      {directionSummary.timeOfDay && <div>🕐 {directionSummary.timeOfDay}</div>}
                      {directionSummary.mood && <div>🎭 {directionSummary.mood}</div>}
                      {directionSummary.keyProps.length > 0 && <div>📦 {directionSummary.keyProps.length} props</div>}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
            
            {/* Status icons - compact */}
            <div className="flex items-center gap-1">
              {/* Direction status */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    hasSceneDirection ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}>
                    {hasSceneDirection ? (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {hasSceneDirection ? 'Direction ready' : 'Direction needed'}
                </TooltipContent>
              </Tooltip>
              
              {/* Image status */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    hasImage ? 'bg-cyan-500' : 'bg-gray-500'
                  }`}>
                    <ImageIcon className="w-3 h-3 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {hasImage ? 'Reference ready' : 'No reference image'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        
        {/* Expand button - top right, always visible on hover when image exists */}
        {hasImage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(true) }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-md transition-opacity opacity-0 group-hover:opacity-100"
              >
                <Maximize2 className="w-3.5 h-3.5 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Expand Image</TooltipContent>
          </Tooltip>
        )}
        
        {/* Hover Controls Overlay */}
        <div className={`absolute inset-0 bg-black/50 transition-opacity flex items-center justify-center gap-2 ${
          hasImage ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
        }`}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUpload(file)
              e.target.value = ''
            }}
          />
          
          {/* Generate Reference or Direction */}
          {hasSceneDirection ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onGenerate() }}
                  disabled={!canGenerate}
                  className="p-2.5 bg-cyan-600/90 hover:bg-cyan-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <Loader className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{hasImage ? 'Regenerate' : 'Generate Reference'}</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { 
                    e.stopPropagation()
                    console.log('[SceneReferenceCard] Generate Direction clicked for scene', sceneNumber)
                    if (onGenerateDirection) {
                      onGenerateDirection()
                    } else {
                      console.warn('[SceneReferenceCard] onGenerateDirection is not defined')
                    }
                  }}
                  disabled={isGeneratingDirection || !onGenerateDirection}
                  className="p-2.5 bg-amber-600/90 hover:bg-amber-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingDirection ? (
                    <Loader className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Lightbulb className="w-4 h-4 text-white" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{onGenerateDirection ? 'Generate Direction' : 'Direction generation not available'}</TooltipContent>
            </Tooltip>
          )}
          
          {/* Edit (only if image exists) */}
          {hasImage && onEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit() }}
                  className="p-2.5 bg-purple-600/90 hover:bg-purple-600 rounded-full transition-colors"
                >
                  <Wand2 className="w-4 h-4 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Edit Reference</TooltipContent>
            </Tooltip>
          )}
          
          {/* Upload */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                className="p-2.5 bg-emerald-600/90 hover:bg-emerald-600 rounded-full transition-colors"
              >
                <Upload className="w-4 h-4 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Upload Image</TooltipContent>
          </Tooltip>
          
          {/* Save to Library (only if image exists) */}
          {hasImage && onSaveToLibrary && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onSaveToLibrary() }}
                  className="p-2.5 bg-blue-600/90 hover:bg-blue-600 rounded-full transition-colors"
                >
                  <FolderPlus className="w-4 h-4 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Save to Library</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      
      {/* Expanded Image Modal */}
      {isExpanded && hasImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-8"
          onClick={() => setIsExpanded(false)}
        >
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="max-w-[90vw] max-h-[90vh]">
            <img 
              src={sceneRefImageUrl} 
              alt={`Scene ${sceneNumber} Reference - Expanded`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="text-center mt-4 text-white">
              <div className="text-lg font-medium">Scene {sceneNumber}: {formattedHeading}</div>
              {directionSummary && (
                <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-400">
                  {directionSummary.location && <span>📍 {directionSummary.location}</span>}
                  {directionSummary.timeOfDay && <span>🕐 {directionSummary.timeOfDay}</span>}
                  {directionSummary.mood && <span>🎭 {directionSummary.mood}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
