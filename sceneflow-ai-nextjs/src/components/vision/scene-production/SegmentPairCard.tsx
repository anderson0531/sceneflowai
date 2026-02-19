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
  Download
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
  onGenerateVideo: () => void
  onOpenDirectorConsole?: () => void
  onEditFrame?: (frameType: 'start' | 'end', frameUrl: string) => void
  onUploadFrame?: (frameType: 'start' | 'end', file: File) => void
  onDownloadFrame?: (frameType: 'start' | 'end', frameUrl: string) => void
  /** Callback for animatic settings changes (image duration) */
  onAnimaticSettingsChange?: (settings: { imageDuration?: number }) => void
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
  onGenerateVideo,
  onOpenDirectorConsole,
  onEditFrame,
  onUploadFrame,
  onDownloadFrame,
  onAnimaticSettingsChange,
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
                  {/* Action buttons overlay */}
                  {!isGenerating && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      {onEditFrame && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 w-7 p-0 bg-white/90 hover:bg-white text-slate-900"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditFrame('start', startFrameUrl)
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 w-7 p-0 bg-white/90 hover:bg-white text-slate-900"
                            onClick={async (e) => {
                              e.stopPropagation()
                              // Download the frame
                              try {
                                const response = await fetch(startFrameUrl)
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
                            <Download className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {isGenerating && generatingPhase === 'start' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <ImageIcon className="w-6 h-6 mb-1 opacity-40" />
                  <span className="text-[10px]">No frame</span>
                  {isGenerating && generatingPhase === 'start' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Start Frame Action Buttons */}
            {isSelected && (
              <div className="flex items-center gap-1.5 mt-2">
                {/* Hidden file input for upload */}
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
                {/* Generate/Regenerate button */}
                {startFrameUrl ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); onGenerateStartFrame(); }}
                        disabled={isGenerating}
                        className="h-6 text-[10px] px-2 border-orange-500/50 text-orange-400 hover:bg-orange-500/10 flex-1"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Generate
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Regenerate Start Frame</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={(e) => { e.stopPropagation(); onGenerateStartFrame(); }}
                    disabled={isGenerating}
                    className="h-6 text-[10px] px-2 bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/50 text-blue-300 flex-1"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Generate
                  </Button>
                )}
                {/* Upload button */}
                {onUploadFrame && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); startFrameInputRef.current?.click(); }}
                        disabled={isGenerating}
                        className="h-6 text-[10px] px-2 border-slate-500/50 text-slate-400 hover:bg-slate-500/10 flex-1"
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        Upload
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Upload Start Frame</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
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
                  {/* Action buttons overlay */}
                  {!isGenerating && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      {onEditFrame && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 w-7 p-0 bg-white/90 hover:bg-white text-slate-900"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditFrame('end', endFrameUrl)
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 w-7 p-0 bg-white/90 hover:bg-white text-slate-900"
                            onClick={async (e) => {
                              e.stopPropagation()
                              // Download the frame
                              try {
                                const response = await fetch(endFrameUrl)
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
                            <Download className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {isGenerating && generatingPhase === 'end' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <ImageIcon className="w-6 h-6 mb-1 opacity-40" />
                  <span className="text-[10px]">No frame</span>
                  {isGenerating && generatingPhase === 'end' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* End Frame Action Buttons */}
            {isSelected && (
              <div className="flex items-center gap-1.5 mt-2">
                {/* Hidden file input for upload */}
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
                {/* Generate/Regenerate button */}
                {endFrameUrl ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); onGenerateEndFrame(); }}
                        disabled={isGenerating}
                        className="h-6 text-[10px] px-2 border-orange-500/50 text-orange-400 hover:bg-orange-500/10 flex-1"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Generate
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Regenerate End Frame</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={(e) => { e.stopPropagation(); onGenerateEndFrame(); }}
                    disabled={isGenerating}
                    className="h-6 text-[10px] px-2 bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/50 text-blue-300 flex-1"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Generate
                  </Button>
                )}
                {/* Upload button */}
                {onUploadFrame && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); endFrameInputRef.current?.click(); }}
                        disabled={isGenerating}
                        className="h-6 text-[10px] px-2 border-slate-500/50 text-slate-400 hover:bg-slate-500/10 flex-1"
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        Upload
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Upload End Frame</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
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
