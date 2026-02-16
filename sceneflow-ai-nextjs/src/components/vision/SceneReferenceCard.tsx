/**
 * SceneReferenceCard - Individual scene reference card for Production Bible Scene tab
 * 
 * Similar to SceneCard in SceneGallery but specifically for scene/backdrop references
 * (environment shots without characters).
 * 
 * Features:
 * - Scene direction readiness indicator (required for generation)
 * - Generate/Edit/Upload controls (unified with Storyboard)
 * - Intelligent prompt building from scene direction data
 * - "Save to Library" button for adding to Reference Library
 */
'use client'

import React, { useRef, useMemo } from 'react'
import { 
  Camera, 
  Sparkles, 
  Wand2, 
  Upload, 
  Loader, 
  CheckCircle2, 
  AlertCircle,
  FolderPlus,
  FileText,
  MapPin,
  Lightbulb
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
  
  // Scene reference image only - NO fallback to storyboard image (imageUrl)
  // Scene references are environment-only shots without actors for production consistency
  const sceneRefImageUrl = scene.sceneReferenceImageUrl
  const hasImage = !!sceneRefImageUrl
  const hasSceneDirection = !!scene.sceneDirection
  
  // Extract key info from scene direction for display
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
    <div 
      onClick={onClick}
      className={`group relative rounded-lg border overflow-hidden transition-all ${
        isSelected 
          ? 'border-cyan-500 ring-2 ring-cyan-500' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Scene Reference Image (environment-only, no actors) */}
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
        {hasImage ? (
          <img 
            src={sceneRefImageUrl} 
            alt={`Scene ${sceneNumber} Reference`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <MapPin className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <span className="text-xs text-gray-500 dark:text-gray-400">No reference</span>
          </div>
        )}
        
        {/* Loading overlay */}
        {(isGenerating || isGeneratingDirection) && (
          <div className="absolute inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-10">
            <Loader className="w-10 h-10 animate-spin text-cyan-400 mb-3" />
            <span className="text-sm text-white font-medium">
              {isGeneratingDirection ? 'Generating Direction...' : 'Generating Reference...'}
            </span>
          </div>
        )}
      </div>
      
      {/* Scene Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="text-white">
          <div className="flex items-center gap-1 text-xs font-semibold">
            <Camera className="w-3 h-3 text-cyan-400" />
            <span>SCENE {sceneNumber}</span>
          </div>
          <div className="text-sm truncate">{formattedHeading}</div>
          {/* Direction summary preview */}
          {directionSummary && (
            <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-300">
              {directionSummary.timeOfDay && (
                <span className="bg-black/40 px-1.5 py-0.5 rounded">{directionSummary.timeOfDay}</span>
              )}
              {directionSummary.mood && (
                <span className="bg-black/40 px-1.5 py-0.5 rounded">{directionSummary.mood}</span>
              )}
              {directionSummary.keyProps.length > 0 && (
                <span className="bg-black/40 px-1.5 py-0.5 rounded">{directionSummary.keyProps.length} props</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Scene Direction Status Indicator - Top Right */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${
            hasSceneDirection 
              ? 'bg-emerald-500/90 text-white' 
              : 'bg-amber-500/90 text-white'
          }`}>
            <FileText className="w-3 h-3" />
            <span>Direction</span>
            {hasSceneDirection ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          {hasSceneDirection ? (
            <span className="text-emerald-400">Scene direction ready</span>
          ) : (
            <span className="text-amber-400">Generate scene direction first</span>
          )}
        </TooltipContent>
      </Tooltip>
      
      {/* Hover Controls */}
      <div className={`absolute inset-0 bg-black/40 transition-opacity rounded-t-lg flex items-center justify-center gap-3 ${
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
            e.target.value = '' // Reset for same file selection
          }}
        />
        
        {/* Generate Reference (Sparkles - cyan) */}
        {hasSceneDirection ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { 
                  e.stopPropagation()
                  onGenerate()
                }}
                disabled={!canGenerate}
                className="p-3 bg-cyan-600/80 hover:bg-cyan-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <Loader className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {hasImage ? 'Regenerate Reference' : 'Generate Scene Reference'}
            </TooltipContent>
          </Tooltip>
        ) : (
          /* Generate Direction fallback button when no direction exists */
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { 
                  e.stopPropagation()
                  onGenerateDirection?.()
                }}
                disabled={isGeneratingDirection}
                className="p-3 bg-amber-600/80 hover:bg-amber-600 rounded-full transition-colors disabled:opacity-50"
              >
                {isGeneratingDirection ? (
                  <Loader className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Lightbulb className="w-5 h-5 text-white" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>Generate Scene Direction First</TooltipContent>
          </Tooltip>
        )}
        
        {/* Edit image (Wand2 - purple) - only show if has image */}
        {hasImage && onEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                className="p-3 bg-purple-600/80 hover:bg-purple-600 rounded-full transition-colors"
              >
                <Wand2 className="w-5 h-5 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Edit Reference</TooltipContent>
          </Tooltip>
        )}
        
        {/* Upload (Upload - emerald) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              className="p-3 bg-emerald-600/80 hover:bg-emerald-600 rounded-full transition-colors"
            >
              <Upload className="w-5 h-5 text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Upload Reference Image</TooltipContent>
        </Tooltip>
        
        {/* Save to Library (FolderPlus - blue) - only show if has image */}
        {hasImage && onSaveToLibrary && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); onSaveToLibrary() }}
                className="p-3 bg-blue-600/80 hover:bg-blue-600 rounded-full transition-colors"
              >
                <FolderPlus className="w-5 h-5 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Save to Reference Library</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
