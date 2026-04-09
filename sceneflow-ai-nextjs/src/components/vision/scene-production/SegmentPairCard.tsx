'use client'

import React from 'react'
import { 
  ArrowRight, 
  ImageIcon,
  Video,
  Wand2,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  Clock,
  Scissors,
  Link2,
  Pencil,
  RefreshCw,
  Upload,
  Download,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { 
  SceneSegment, 
  TransitionType, 
  AnchorStatus, 
  ActionType 
} from './types'

// ============================================================================
// Types
// ============================================================================

export interface SegmentPairCardProps {
  segment: SceneSegment
  segmentIndex: number
  isSelected: boolean
  onSelect: () => void
  onGenerateStartFrame: () => void
  onGenerateEndFrame: () => void
  onGenerateBothFrames: () => void
  onAdvancedFrameOptions: (frameType: 'start' | 'end' | 'both') => void
  onGenerateVideo: () => void
  onOpenDirectorConsole?: () => void
  onEditFrame?: (frameType: 'start' | 'end', frameUrl: string) => void
  onUploadFrame?: (frameType: 'start' | 'end', file: File) => void
  onDownloadFrame?: (frameType: 'start' | 'end', frameUrl: string) => void
  /** Callback for animatic settings changes (image duration) */
  onAnimaticSettingsChange?: (settings: { imageDuration?: number }) => void
  /** Callback to delete this segment */
  onDelete?: () => void
  isGenerating: boolean
  generatingPhase?: 'start' | 'end' | 'video'
  previousSegmentEndFrame?: string | null
  sceneImageUrl?: string | null
}

// ============================================================================
// Helper Functions
// ============================================================================

function getAnchorStatusColor(status: AnchorStatus | undefined): string {
  switch (status) {
    case 'fully-anchored': return 'text-green-400 bg-green-500/10 border-green-500/30'
    case 'start-locked': return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    case 'end-pending': return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    case 'pending': 
    default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30'
  }
}

function getAnchorStatusLabel(status: AnchorStatus | undefined): string {
  switch (status) {
    case 'fully-anchored': return 'FTV Ready'
    case 'start-locked': return 'Start Locked'
    case 'end-pending': return 'End Pending'
    case 'pending': 
    default: return 'Not Anchored'
  }
}

function getTransitionIcon(type: TransitionType | undefined) {
  if (type === 'CONTINUE') {
    return <Link2 className="w-3 h-3" />
  }
  return <Scissors className="w-3 h-3" />
}

function getTransitionLabel(type: TransitionType | undefined): string {
  return type === 'CONTINUE' ? 'Continue' : 'Cut'
}

function getActionTypeColor(type: ActionType | undefined): string {
  switch (type) {
    case 'static': return 'bg-blue-500/20 text-blue-300'
    case 'subtle': return 'bg-cyan-500/20 text-cyan-300'
    case 'speaking': return 'bg-purple-500/20 text-purple-300'
    case 'gesture': return 'bg-indigo-500/20 text-indigo-300'
    case 'movement': return 'bg-amber-500/20 text-amber-300'
    case 'action': return 'bg-orange-500/20 text-orange-300'
    case 'transformation': return 'bg-red-500/20 text-red-300'
    default: return 'bg-slate-500/20 text-slate-300'
  }
}

// ============================================================================
// SegmentPairCard Component
// ============================================================================

export function SegmentPairCard({
  segment,
  segmentIndex,
  isSelected,
  onSelect,
  onGenerateStartFrame,
  onGenerateEndFrame,
  onGenerateBothFrames,
  onAdvancedFrameOptions,
  onGenerateVideo,
  onOpenDirectorConsole,
  onEditFrame,
  onUploadFrame,
  onDownloadFrame,
  onAnimaticSettingsChange,
  onDelete,
  isGenerating,
  generatingPhase,
  previousSegmentEndFrame,
  sceneImageUrl
}: SegmentPairCardProps) {
  // File input refs for upload
  const startFrameInputRef = React.useRef<HTMLInputElement>(null)
  const endFrameInputRef = React.useRef<HTMLInputElement>(null)
  
  const duration = segment.endTime - segment.startTime
  const anchorStatus = segment.anchorStatus || 'pending'
  const transitionType = segment.transitionType || 'CUT'
  const actionType = segment.actionType || 'gesture'
  
  // Get frame URLs
  const startFrameUrl = segment.startFrameUrl || segment.references?.startFrameUrl || segment.activeAssetUrl
  const endFrameUrl = segment.endFrameUrl || segment.references?.endFrameUrl
  
  // Determine if we can generate frames
  const canGenerateStart = !startFrameUrl && !isGenerating
  const canGenerateEnd = !endFrameUrl && !isGenerating
  
  // Determine if we can REGENERATE frames (frames already exist)
  const canRegenerateStart = !!startFrameUrl && !isGenerating
  const canRegenerateEnd = !!endFrameUrl && !isGenerating

  return (
    <TooltipProvider>
      {/* Hidden file inputs for upload */}
      <input
        ref={startFrameInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && onUploadFrame) {
            onUploadFrame('start', file)
          }
          e.target.value = '' // Reset for re-upload
        }}
      />
      <input
        ref={endFrameInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && onUploadFrame) {
            onUploadFrame('end', file)
          }
          e.target.value = '' // Reset for re-upload
        }}
      />
    <div 
      className={cn(
        "relative rounded-lg border transition-all cursor-pointer",
        isSelected 
          ? "border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10" 
          : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          {/* Segment Number */}
          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium">
            {segmentIndex + 1}
          </div>
          
          {/* Transition Badge */}
          <Badge 
            variant="outline" 
            className={cn("text-[10px] py-0 h-5", 
              transitionType === 'CONTINUE' 
                ? "border-blue-500/30 text-blue-400" 
                : "border-amber-500/30 text-amber-400"
            )}
          >
            {getTransitionIcon(transitionType)}
            <span className="ml-1">{getTransitionLabel(transitionType)}</span>
          </Badge>
          
          {/* Action Type Badge */}
          <Badge 
            variant="secondary" 
            className={cn("text-[10px] py-0 h-5 capitalize", getActionTypeColor(actionType))}
          >
            {actionType}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Duration */}
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {duration.toFixed(1)}s
          </span>
          
          {/* Anchor Status Badge */}
          <Badge 
            variant="outline" 
            className={cn("text-[10px] py-0 h-5", getAnchorStatusColor(anchorStatus))}
          >
            {anchorStatus === 'fully-anchored' ? (
              <CheckCircle2 className="w-3 h-3 mr-1" />
            ) : anchorStatus === 'pending' ? (
              <AlertCircle className="w-3 h-3 mr-1" />
            ) : (
              <Lock className="w-3 h-3 mr-1" />
            )}
            {getAnchorStatusLabel(anchorStatus)}
          </Badge>
          
          {/* Delete Button */}
          {onDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  disabled={isGenerating}
                  className="h-6 w-6 p-0 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Segment</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      
      {/* Frame Pair Visualization */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          {/* Start Frame */}
          <div className="flex-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              {startFrameUrl ? <Lock className="w-3 h-3 text-green-400" /> : <Unlock className="w-3 h-3" />}
              Start Frame
            </div>
            <div 
              className={cn(
                "aspect-video rounded-md border overflow-hidden relative group",
                startFrameUrl ? "border-slate-600" : "border-dashed border-slate-600 bg-slate-900/50"
              )}
            >
              {startFrameUrl ? (
                <>
                  <img 
                    src={startFrameUrl} 
                    alt="Start frame" 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Floating Action Buttons Overlay */}
                  {!isGenerating && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                      {/* Generate / Regenerate */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-10 w-10 rounded-full p-0 bg-blue-600/90 hover:bg-blue-500 text-white shadow-lg border border-blue-400/50"
                            onClick={(e) => {
                              e.stopPropagation()
                              onGenerateStartFrame()
                            }}
                          >
                            {true ? <RefreshCw className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{true ? 'Regenerate' : 'Quick Generate'}</TooltipContent>
                      </Tooltip>
                      
                      {/* Advanced Settings */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-10 w-10 rounded-full p-0 bg-slate-800/90 hover:bg-slate-700 text-slate-200 shadow-lg border border-slate-600/50"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAdvancedFrameOptions('start')
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Advanced Options</TooltipContent>
                      </Tooltip>

                      {/* Upload */}
                      {onUploadFrame && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-10 w-10 rounded-full p-0 bg-slate-800/90 hover:bg-slate-700 text-slate-200 shadow-lg border border-slate-600/50"
                              onClick={(e) => {
                                e.stopPropagation()
                                startFrameInputRef.current?.click()
                              }}
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Upload Frame</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Download (only if generated) */}
                      {true && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-10 w-10 rounded-full p-0 bg-slate-800/90 hover:bg-slate-700 text-slate-200 shadow-lg border border-slate-600/50"
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  const response = await fetch(startFrameUrl as string)
                                  const blob = await response.blob()
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `segment-${segmentIndex + 1}-start-frame.png`
                                  document.body.appendChild(a)
                                  a.click()
                                  document.body.removeChild(a)
                                  window.URL.revokeObjectURL(url)
                                } catch (error) {
                                  console.error('Download failed:', error)
                                }
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                  {isGenerating && generatingPhase === 'start' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  )}

                </>
              ) : (
                <>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50">
                    <ImageIcon className="w-6 h-6 mb-1 opacity-40" />
                    <span className="text-[10px]">No frame</span>
                  </div>
                  
                  {/* Floating Action Buttons Overlay */}
                  {!isGenerating && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                      {/* Generate / Regenerate */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-10 w-10 rounded-full p-0 bg-blue-600/90 hover:bg-blue-500 text-white shadow-lg border border-blue-400/50"
                            onClick={(e) => {
                              e.stopPropagation()
                              onGenerateStartFrame()
                            }}
                          >
                            {false ? <RefreshCw className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{false ? 'Regenerate' : 'Quick Generate'}</TooltipContent>
                      </Tooltip>
                      
                      {/* Advanced Settings */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-10 w-10 rounded-full p-0 bg-slate-800/90 hover:bg-slate-700 text-slate-200 shadow-lg border border-slate-600/50"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAdvancedFrameOptions('start')
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Advanced Options</TooltipContent>
                      </Tooltip>

                      {/* Upload */}
                      {onUploadFrame && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-10 w-10 rounded-full p-0 bg-slate-800/90 hover:bg-slate-700 text-slate-200 shadow-lg border border-slate-600/50"
                              onClick={(e) => {
                                e.stopPropagation()
                                startFrameInputRef.current?.click()
                              }}
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Upload Frame</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Download (only if generated) */}
                      {false && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-10 w-10 rounded-full p-0 bg-slate-800/90 hover:bg-slate-700 text-slate-200 shadow-lg border border-slate-600/50"
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  const response = await fetch(startFrameUrl as string)
                                  const blob = await response.blob()
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `segment-${segmentIndex + 1}-start-frame.png`
                                  document.body.appendChild(a)
                                  a.click()
                                  document.body.removeChild(a)
                                  window.URL.revokeObjectURL(url)
                                } catch (error) {
                                  console.error('Download failed:', error)
                                }
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                  {isGenerating && generatingPhase === 'start' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  )}

                </>
              )}
            </div>
          </div>
          
          {/* Arrow with Duration */}
          <div className="flex flex-col items-center gap-1 py-4">
            <ArrowRight className="w-5 h-5 text-slate-500" />
            <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
              {duration.toFixed(1)}s
            </span>
          </div>
          
          {/* End Frame */}
          <div className="flex-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              {endFrameUrl ? <Lock className="w-3 h-3 text-green-400" /> : <Unlock className="w-3 h-3" />}
              End Frame
            </div>
            <div 
              className={cn(
                "aspect-video rounded-md border overflow-hidden relative group",
                endFrameUrl ? "border-slate-600" : "border-dashed border-slate-600 bg-slate-900/50"
              )}
            >
              {endFrameUrl ? (
                <>
                  <img 
                    src={endFrameUrl} 
                    alt="End frame" 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Floating Action Buttons Overlay */}
                  {!isGenerating && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                      {/* Generate / Regenerate */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-10 w-10 rounded-full p-0 bg-blue-600/90 hover:bg-blue-500 text-white shadow-lg border border-blue-400/50"
                            onClick={(e) => {
                              e.stopPropagation()
                              onGenerateEndFrame()
                            }}
                          >
                            {true ? <RefreshCw className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{true ? 'Regenerate' : 'Quick Generate'}</TooltipContent>
                      </Tooltip>
                      
                      {/* Advanced Settings */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-10 w-10 rounded-full p-0 bg-slate-800/90 hover:bg-slate-700 text-slate-200 shadow-lg border border-slate-600/50"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAdvancedFrameOptions('end')
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Advanced Options</TooltipContent>
                      </Tooltip>

                      {/* Upload */}
                      {onUploadFrame && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-10 w-10 rounded-full p-0 bg-slate-800/90 hover:bg-slate-700 text-slate-200 shadow-lg border border-slate-600/50"
                              onClick={(e) => {
                                e.stopPropagation()
                                endFrameInputRef.current?.click()
                              }}
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Upload Frame</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Download (only if generated) */}
                      {true && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-10 w-10 rounded-full p-0 bg-slate-800/90 hover:bg-slate-700 text-slate-200 shadow-lg border border-slate-600/50"
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  const response = await fetch(endFrameUrl as string)
                                  const blob = await response.blob()
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `segment-${segmentIndex + 1}-end-frame.png`
                                  document.body.appendChild(a)
                                  a.click()
                                  document.body.removeChild(a)
                                  window.URL.revokeObjectURL(url)
                                } catch (error) {
                                  console.error('Download failed:', error)
                                }
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                  {isGenerating && generatingPhase === 'end' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  )}

                </>
              ) : (
                <>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50">
                    <ImageIcon className="w-6 h-6 mb-1 opacity-40" />
                    <span className="text-[10px]">No frame</span>
                  </div>
                  
                  {/* Floating Action Buttons Overlay */}
                  {!isGenerating && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                      {/* Generate / Regenerate */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-10 w-10 rounded-full p-0 bg-blue-600/90 hover:bg-blue-500 text-white shadow-lg border border-blue-400/50"
                            onClick={(e) => {
                              e.stopPropagation()
                              onGenerateEndFrame()
                            }}
                          >
                            {false ? <RefreshCw className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{false ? 'Regenerate' : 'Quick Generate'}</TooltipContent>
                      </Tooltip>
                      
                      {/* Advanced Settings */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-10 w-10 rounded-full p-0 bg-slate-800/90 hover:bg-slate-700 text-slate-200 shadow-lg border border-slate-600/50"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAdvancedFrameOptions('end')
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Advanced Options</TooltipContent>
                      </Tooltip>

                      {/* Upload */}
                      {onUploadFrame && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-10 w-10 rounded-full p-0 bg-slate-800/90 hover:bg-slate-700 text-slate-200 shadow-lg border border-slate-600/50"
                              onClick={(e) => {
                                e.stopPropagation()
                                endFrameInputRef.current?.click()
                              }}
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Upload Frame</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Download (only if generated) */}
                      {false && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-10 w-10 rounded-full p-0 bg-slate-800/90 hover:bg-slate-700 text-slate-200 shadow-lg border border-slate-600/50"
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  const response = await fetch(endFrameUrl as string)
                                  const blob = await response.blob()
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `segment-${segmentIndex + 1}-end-frame.png`
                                  document.body.appendChild(a)
                                  a.click()
                                  document.body.removeChild(a)
                                  window.URL.revokeObjectURL(url)
                                } catch (error) {
                                  console.error('Download failed:', error)
                                }
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                  {isGenerating && generatingPhase === 'end' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  )}

                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Generation Progress Overlay */}
      {isGenerating && (
        <div className="absolute bottom-0 left-0 right-0 h-1">
          <div className="h-full bg-blue-500 animate-pulse" />
        </div>
      )}
    </div>
    </TooltipProvider>
  )
}

export default SegmentPairCard
