'use client'

import React, { useState, useRef } from 'react'
import { ImageIcon, Sparkles, Upload, Wand2, Loader2, CheckCircle2, RefreshCw, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

export interface SceneImageFrameProps {
  sceneIdx: number
  sceneNumber: number
  imageUrl?: string | null
  isGenerating?: boolean
  onGenerate: () => void
  onUpload: (file: File) => void
  onEdit?: (imageUrl: string) => void
  onAddToReferenceLibrary?: (imageUrl: string, name: string, sceneNumber: number) => void
  /** Compact mode for production bible - smaller frame */
  compact?: boolean
  /** Show as a card with border */
  showBorder?: boolean
  /** Label to display in header */
  label?: string
}

/**
 * SceneImageFrame - A frame-based component for scene reference images
 * 
 * Similar to CharacterCard image frames, this provides:
 * - Empty state with centered icon + Create/Upload buttons
 * - Populated state with hover overlay actions
 * - 16:9 aspect ratio for cinematic consistency
 * - Status badges for readiness state
 */
export function SceneImageFrame({
  sceneIdx,
  sceneNumber,
  imageUrl,
  isGenerating = false,
  onGenerate,
  onUpload,
  onEdit,
  onAddToReferenceLibrary,
  compact = false,
  showBorder = true,
  label = 'Scene Reference',
}: SceneImageFrameProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  
  const hasImage = !!imageUrl
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      onUpload(file)
    }
    e.target.value = ''
  }
  
  const triggerUpload = () => {
    fileInputRef.current?.click()
  }
  
  return (
    <div 
      className={`relative overflow-hidden rounded-lg ${
        showBorder ? 'border border-slate-700/50' : ''
      } ${compact ? 'w-full' : ''}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      
      {/* Image Container - 16:9 aspect ratio */}
      <div className={`relative ${compact ? 'aspect-video' : 'aspect-video'} bg-slate-800/50`}>
        {hasImage ? (
          <>
            {/* Scene Image */}
            <img
              src={imageUrl}
              alt={`Scene ${sceneNumber} reference`}
              className="w-full h-full object-cover"
            />
            
            {/* Status Badge */}
            <div className="absolute top-2 right-2 z-10">
              <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1 backdrop-blur-sm">
                <CheckCircle2 className="w-3 h-3" />
                Ready
              </span>
            </div>
            
            {/* Hover Overlay with Actions */}
            <AnimatePresence>
              {isHovering && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3"
                >
                  {/* Regenerate */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onGenerate()
                    }}
                    disabled={isGenerating}
                    className="p-3 bg-indigo-600/80 hover:bg-indigo-600 rounded-full transition-colors disabled:opacity-50"
                    title="Generate new image"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5 text-white" />
                    )}
                  </button>
                  
                  {/* Edit */}
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(imageUrl)
                      }}
                      className="p-3 bg-purple-600/80 hover:bg-purple-600 rounded-full transition-colors"
                      title="Edit image"
                    >
                      <Wand2 className="w-5 h-5 text-white" />
                    </button>
                  )}
                  
                  {/* Add to Reference Library */}
                  {onAddToReferenceLibrary && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddToReferenceLibrary(imageUrl, `Scene ${sceneNumber} Reference`, sceneNumber)
                      }}
                      className="p-3 bg-cyan-600/80 hover:bg-cyan-600 rounded-full transition-colors"
                      title="Save to Reference Library"
                    >
                      <FolderPlus className="w-5 h-5 text-white" />
                    </button>
                  )}
                  
                  {/* Upload */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerUpload()
                    }}
                    className="p-3 bg-emerald-600/80 hover:bg-emerald-600 rounded-full transition-colors"
                    title="Upload image"
                  >
                    <Upload className="w-5 h-5 text-white" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Generating Overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  <span className="text-xs text-white/80">Generating...</span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="relative mb-3">
              {/* Decorative film frame border */}
              <div className="absolute -inset-2 border-2 border-dashed border-indigo-500/30 rounded-lg" />
              <ImageIcon className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} text-indigo-400/50`} />
            </div>
            
            {!compact && (
              <p className="text-sm text-gray-400 text-center mb-2">
                No scene reference yet
              </p>
            )}
            
            <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-500 text-center mb-3 max-w-xs`}>
              {compact 
                ? 'Generate or upload a reference image'
                : 'Create a reference image for scene consistency across production'
              }
            </p>
            
            <div className="flex items-center gap-2">
              <Button
                size={compact ? 'sm' : 'default'}
                onClick={(e) => {
                  e.stopPropagation()
                  onGenerate()
                }}
                disabled={isGenerating}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1" />
                )}
                {compact ? 'Create' : 'Generate'}
              </Button>
              
              <Button
                size={compact ? 'sm' : 'default'}
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  triggerUpload()
                }}
                className="border-slate-600 hover:bg-slate-700"
              >
                <Upload className="w-4 h-4 mr-1" />
                Upload
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Label Footer (optional) */}
      {label && !compact && (
        <div className="px-3 py-2 bg-slate-800/50 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{label}</span>
            <span className="text-xs text-slate-500">Scene {sceneNumber}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default SceneImageFrame
