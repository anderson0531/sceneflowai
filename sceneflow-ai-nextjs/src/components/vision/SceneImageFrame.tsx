'use client'

import React, { useState, useRef } from 'react'
import { ImageIcon, Sparkles, Upload, Wand2, Loader2, CheckCircle2, RefreshCw, FolderPlus, Trash2, AlertTriangle, Tags } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface SceneImageFrameProps {
  sceneIdx: number
  sceneNumber: number
  imageUrl?: string | null
  /** When true, imageUrl is a borrowed establishing/anchor shot — not this frame's own cut. */
  isPlaceholder?: boolean
  /** Highlight when this frame drives the large scene preview. */
  isSelected?: boolean
  onSelect?: () => void
  isGenerating?: boolean
  onGenerate: () => void
  onUpload: (file: File) => void
  onEdit?: (imageUrl: string) => void
  onDelete?: () => void
  onAddToReferenceLibrary?: (imageUrl: string, name: string, sceneNumber: number) => void
  /** Compact mode for storyboard strip — icon-only controls */
  compact?: boolean
  /** Show as a card with border */
  showBorder?: boolean
  /** Label to display in header */
  label?: string
  /** draft | final — shown when frame has its own image */
  imageTier?: 'draft' | 'final'
  /** Beat planner role (e.g. title_reveal, opening). */
  beatRole?: string
  /** Image generation prompt used for this frame. */
  imagePrompt?: string
  /** Open beat reference review dialog (Pre-Vis storyboard). */
  onReviewReferences?: () => void
  /** When false, hide generate/upload/edit controls (navigation + prompt only). */
  showControls?: boolean
  /** compact = small overlay buttons; comfortable = larger hero controls */
  controlsVariant?: 'compact' | 'comfortable'
  /** Keep action bar visible without hover (hero preview). */
  alwaysShowControls?: boolean
  /** Max lines for prompt preview in footer (hero uses more). */
  promptLineClamp?: number
}

function CompactIconButton({
  onClick,
  disabled,
  title,
  className,
  children,
  size = 'compact',
}: {
  onClick: (e: React.MouseEvent) => void
  disabled?: boolean
  title: string
  className: string
  children: React.ReactNode
  size?: 'compact' | 'comfortable'
}) {
  const sizeClass = size === 'comfortable' ? 'h-10 w-10' : 'h-7 w-7'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`${sizeClass} flex items-center justify-center rounded-full transition-colors disabled:opacity-50 ${className}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  )
}

function CompactActionBar({
  hasImage,
  imageUrl,
  isGenerating,
  onGenerate,
  onUpload,
  onEdit,
  onDelete,
  onAddToReferenceLibrary,
  onReviewReferences,
  sceneNumber,
  alwaysVisible = false,
  controlsVariant = 'compact',
}: {
  hasImage: boolean
  imageUrl?: string | null
  isGenerating?: boolean
  onGenerate: () => void
  onUpload: () => void
  onEdit?: (imageUrl: string) => void
  onDelete?: () => void
  onAddToReferenceLibrary?: (imageUrl: string, name: string, sceneNumber: number) => void
  onReviewReferences?: () => void
  sceneNumber: number
  alwaysVisible?: boolean
  controlsVariant?: 'compact' | 'comfortable'
}) {
  const iconClass =
    controlsVariant === 'comfortable' ? 'w-5 h-5 text-white' : 'w-3.5 h-3.5 text-white'
  const buttonSize = controlsVariant === 'comfortable' ? 'comfortable' : 'compact'

  return (
    <div
      className={`absolute inset-0 flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-black/50 ${
        alwaysVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      } transition-opacity`}
      onClick={(e) => e.stopPropagation()}
    >
      <CompactIconButton
        onClick={(e) => {
          e.stopPropagation()
          onGenerate()
        }}
        disabled={isGenerating}
        title={hasImage ? 'Regenerate' : 'Generate'}
        className="bg-indigo-600/90 hover:bg-indigo-500"
        size={buttonSize}
      >
        {isGenerating ? (
          <Loader2 className={`${iconClass} animate-spin`} />
        ) : hasImage ? (
          <RefreshCw className={iconClass} />
        ) : (
          <Sparkles className={iconClass} />
        )}
      </CompactIconButton>

      {onReviewReferences && (
        <CompactIconButton
          onClick={(e) => {
            e.stopPropagation()
            onReviewReferences()
          }}
          disabled={isGenerating}
          title="References"
          className="bg-slate-600/90 hover:bg-slate-500"
          size={buttonSize}
        >
          <Tags className={iconClass} />
        </CompactIconButton>
      )}

      {onEdit && hasImage && imageUrl && (
        <CompactIconButton
          onClick={(e) => {
            e.stopPropagation()
            onEdit(imageUrl)
          }}
          title="AI edit"
          className="bg-purple-600/90 hover:bg-purple-500"
          size={buttonSize}
        >
          <Wand2 className={iconClass} />
        </CompactIconButton>
      )}

      {onAddToReferenceLibrary && hasImage && imageUrl && (
        <CompactIconButton
          onClick={(e) => {
            e.stopPropagation()
            onAddToReferenceLibrary(imageUrl, `Scene ${sceneNumber} Reference`, sceneNumber)
          }}
          title="Save to library"
          className="bg-cyan-600/90 hover:bg-cyan-500"
          size={buttonSize}
        >
          <FolderPlus className={iconClass} />
        </CompactIconButton>
      )}

      <CompactIconButton
        onClick={(e) => {
          e.stopPropagation()
          onUpload()
        }}
        title="Upload"
        className="bg-emerald-600/90 hover:bg-emerald-500"
        size={buttonSize}
      >
        <Upload className={iconClass} />
      </CompactIconButton>

      {onDelete && (
        <CompactIconButton
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          title="Delete"
          className="bg-red-600/90 hover:bg-red-500"
          size={buttonSize}
        >
          <Trash2 className={iconClass} />
        </CompactIconButton>
      )}
    </div>
  )
}

function formatBeatRoleLabel(beatRole?: string): string | null {
  if (!beatRole) return null
  if (beatRole === 'title_reveal') return 'Title'
  if (beatRole === 'credit') return 'Credit'
  if (beatRole === 'opening') return 'Opening'
  if (beatRole === 'dissolve') return 'Dissolve'
  if (beatRole === 'climax') return 'Climax'
  if (beatRole === 'progression') return 'Progression'
  return beatRole.replace(/_/g, ' ')
}
export function SceneImageFrame({
  sceneIdx,
  sceneNumber,
  imageUrl,
  isPlaceholder = false,
  isSelected = false,
  onSelect,
  isGenerating = false,
  onGenerate,
  onUpload,
  onEdit,
  onDelete,
  onAddToReferenceLibrary,
  compact = false,
  showBorder = true,
  label = 'Scene Reference',
  imageTier,
  beatRole,
  imagePrompt,
  onReviewReferences,
  showControls = true,
  controlsVariant = 'compact',
  alwaysShowControls = false,
  promptLineClamp,
}: SceneImageFrameProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  const roleLabel = formatBeatRoleLabel(beatRole)
  const promptPreview = imagePrompt?.trim()
  const useOverlayControls = compact || alwaysShowControls
  const promptClampClass =
    promptLineClamp === 4
      ? 'line-clamp-4'
      : promptLineClamp === 3
        ? 'line-clamp-3'
        : 'line-clamp-2'

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
      className={`group relative overflow-hidden rounded-lg ${
        showBorder ? 'border border-slate-700/50' : ''
      } ${compact ? 'w-full' : ''} ${
        isSelected ? 'ring-2 ring-sf-primary border-sf-primary/60' : ''
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={(e) => {
        if (!onSelect) return
        e.stopPropagation()
        onSelect()
      }}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onSelect) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onSelect()
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="relative aspect-video bg-slate-800/50">
        {hasImage ? (
          <>
            <img
              key={imageUrl}
              src={imageUrl}
              alt={`Scene ${sceneNumber} reference`}
              className="w-full h-full object-cover"
            />

            <div className="absolute top-1 right-1 z-10">
              {isPlaceholder ? (
                <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full flex items-center gap-0.5 backdrop-blur-sm">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Placeholder
                </span>
              ) : imageTier === 'final' ? (
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/25 text-emerald-300 rounded-full backdrop-blur-sm">
                  Final
                </span>
              ) : imageTier === 'draft' ? (
                <span className="text-[9px] px-1.5 py-0.5 bg-gray-500/25 text-gray-300 rounded-full backdrop-blur-sm">
                  Draft
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-0.5 backdrop-blur-sm">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Ready
                </span>
              )}
            </div>

            {isPlaceholder && !compact && (
              <div className="absolute bottom-0 left-0 right-0 bg-amber-950/80 px-2 py-1">
                <p className="text-[9px] text-amber-200/90 leading-tight">
                  Using anchor frame — generate a dedicated cut
                </p>
              </div>
            )}

            {showControls && useOverlayControls ? (
              <CompactActionBar
                hasImage
                imageUrl={imageUrl}
                isGenerating={isGenerating}
                onGenerate={onGenerate}
                onUpload={triggerUpload}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddToReferenceLibrary={onAddToReferenceLibrary}
                onReviewReferences={onReviewReferences}
                sceneNumber={sceneNumber}
                alwaysVisible={alwaysShowControls || !compact}
                controlsVariant={controlsVariant}
              />
            ) : showControls && !useOverlayControls ? (
              <AnimatePresence>
                {isHovering && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
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

                    {onReviewReferences && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onReviewReferences()
                        }}
                        disabled={isGenerating}
                        className="p-3 bg-slate-600/80 hover:bg-slate-600 rounded-full transition-colors disabled:opacity-50"
                        title="References"
                      >
                        <Tags className="w-5 h-5 text-white" />
                      </button>
                    )}

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
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            )}
          </>
        ) : compact ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <ImageIcon className="w-8 h-8 text-indigo-400/40 mb-1" />
            {showControls && (
              <CompactActionBar
                hasImage={false}
                isGenerating={isGenerating}
                onGenerate={onGenerate}
                onUpload={triggerUpload}
                onDelete={onDelete}
                onReviewReferences={onReviewReferences}
                sceneNumber={sceneNumber}
                alwaysVisible
                controlsVariant={controlsVariant}
              />
            )}
          </div>
        ) : showControls ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="relative mb-3">
              <div className="absolute -inset-2 border-2 border-dashed border-indigo-500/30 rounded-lg" />
              <ImageIcon className="w-12 h-12 text-indigo-400/50" />
            </div>
            <p className="text-sm text-gray-400 text-center mb-2">No scene reference yet</p>
            <p className="text-xs text-gray-500 text-center mb-3 max-w-xs">
              Create a reference image for scene consistency across production
            </p>
            <div className="flex items-center gap-2">
              <Button
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
                Generate
              </Button>
              <Button
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
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <ImageIcon className="w-12 h-12 text-indigo-400/50" />
            <p className="text-sm text-gray-400 text-center mt-2">No frame image</p>
          </div>
        )}
      </div>

      {label && compact && (
        <div className="px-1.5 py-1 bg-slate-800/50 border-t border-slate-700/50">
          <div className="flex items-center gap-1 min-w-0">
            {roleLabel && (
              <span
                className={`shrink-0 text-[8px] px-1 py-0.5 rounded ${
                  beatRole === 'title_reveal'
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'bg-slate-600/40 text-slate-300'
                }`}
              >
                {roleLabel}
              </span>
            )}
            <p className="text-[9px] font-medium text-slate-400 truncate" title={label}>
              {label}
            </p>
          </div>
          {promptPreview && (
            <p
              className={`text-[8px] text-slate-500 ${promptClampClass} italic mt-0.5 cursor-help`}
              title={promptPreview}
              onClick={(e) => {
                e.stopPropagation()
                void navigator.clipboard.writeText(promptPreview).then(() => {
                  toast.success('Prompt copied')
                })
              }}
            >
              Prompt: {promptPreview}
            </p>
          )}
        </div>
      )}

      {label && !compact && (
        <div className="px-3 py-2 bg-slate-800/50 border-t border-slate-700/50">
          <div className="flex items-center gap-2 min-w-0">
            {roleLabel && (
              <span
                className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                  beatRole === 'title_reveal'
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'bg-slate-600/40 text-slate-300'
                }`}
              >
                {roleLabel}
              </span>
            )}
            <span className="text-xs font-medium text-slate-400 truncate">{label}</span>
            <span className="text-xs text-slate-500 ml-auto shrink-0">Scene {sceneNumber}</span>
          </div>
          {promptPreview && (
            <p
              className={`text-[11px] text-slate-500 ${promptClampClass} italic mt-1.5 cursor-help`}
              title={promptPreview}
              onClick={(e) => {
                e.stopPropagation()
                void navigator.clipboard.writeText(promptPreview).then(() => {
                  toast.success('Prompt copied')
                })
              }}
            >
              {promptPreview}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default SceneImageFrame
