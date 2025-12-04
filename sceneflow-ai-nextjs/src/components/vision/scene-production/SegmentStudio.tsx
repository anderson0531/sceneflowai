'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SceneSegment, SceneProductionReferences, SceneSegmentStatus } from './types'
import { Upload, Video, Image as ImageIcon, CheckCircle2, Link as LinkIcon, Sparkles, Loader2, Info, Film, Play, X, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SegmentPromptBuilder, GeneratePromptData, VideoGenerationMethod } from './SegmentPromptBuilder'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export type GenerationType = 'T2V' | 'I2V' | 'T2I' | 'UPLOAD'

interface SegmentPromptSummary {
  promptText: string
  platform?: string
  promptType?: GenerationType
  characterNames?: string[]
  sceneRefNames?: string[]
  objectNames?: string[]
}

interface SegmentStudioProps {
  segment: SceneSegment | null
  previousSegmentLastFrame?: string | null
  onGenerate: (mode: GenerationType, options?: { 
    startFrameUrl?: string
    endFrameUrl?: string
    referenceImages?: Array<{ url: string; type: 'style' | 'character' }>
    generationMethod?: VideoGenerationMethod
    prompt?: string
    negativePrompt?: string
    duration?: number
    aspectRatio?: '16:9' | '9:16'
    resolution?: '720p' | '1080p'
  }) => Promise<void>
  onUploadMedia: (file: File) => Promise<void>
  onPromptChange?: (prompt: string) => void
  references: SceneProductionReferences
  estimatedCredits?: number | null
  promptSummary?: SegmentPromptSummary | null
  onOpenPromptBuilder?: () => void
  onOpenScenePreview?: () => void
  sceneImageUrl?: string
}

export function SegmentStudio({
  segment,
  previousSegmentLastFrame,
  onGenerate,
  onUploadMedia,
  onPromptChange,
  references,
  estimatedCredits,
  promptSummary,
  onOpenPromptBuilder,
  onOpenScenePreview,
  sceneImageUrl,
}: SegmentStudioProps) {
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isTakesGalleryOpen, setIsTakesGalleryOpen] = useState(false)
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null)
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false)
  
  // Prompt Builder State
  const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false)
  const [promptBuilderMode, setPromptBuilderMode] = useState<'image' | 'video'>('video')

  if (!segment) {
    return (
      <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Select a segment from the timeline to review prompts, references, and takes.
      </div>
    )
  }

  const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await onUploadMedia(file)
    }
  }

  // Open Video Prompt Builder
  const handleOpenVideoBuilder = () => {
    setPromptBuilderMode('video')
    setIsPromptBuilderOpen(true)
  }

  // Open Image Prompt Builder
  const handleOpenImageBuilder = () => {
    setPromptBuilderMode('image')
    setIsPromptBuilderOpen(true)
  }
  
  // Handle generation from the new SegmentPromptBuilder
  const handlePromptBuilderGenerate = async (promptData: GeneratePromptData) => {
    // Determine generation type based on mode and method
    let genType: GenerationType = 'T2V'
    if (promptData.mode === 'image') {
      genType = 'T2I'
    } else if (promptData.startFrameUrl) {
      genType = 'I2V'
    }
    
    await onGenerate(genType, {
      prompt: promptData.prompt,
      negativePrompt: promptData.negativePrompt,
      duration: promptData.duration,
      aspectRatio: promptData.aspectRatio,
      resolution: promptData.resolution,
      startFrameUrl: promptData.startFrameUrl,
      endFrameUrl: promptData.endFrameUrl,
      referenceImages: promptData.referenceImages,
      generationMethod: promptData.generationMethod,
    })
  }

  const displayStatus = (status: SceneSegmentStatus) => {
    switch (status) {
      case 'GENERATING':
        return 'Generating asset…'
      case 'COMPLETE':
        return 'Segment locked'
      case 'UPLOADED':
        return 'Custom media uploaded'
      case 'ERROR':
        return 'Needs attention'
      default:
        return 'In progress'
    }
  }

  const getStatusColor = (status: SceneSegmentStatus) => {
    switch (status) {
      case 'GENERATING':
        return 'text-blue-600 dark:text-blue-400'
      case 'COMPLETE':
        return 'text-green-600 dark:text-green-400'
      case 'UPLOADED':
        return 'text-purple-600 dark:text-purple-400'
      case 'ERROR':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Generation/Upload Status - Above Everything */}
      {segment.status === 'GENERATING' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Generating Segment {segment.sequenceIndex + 1}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Generating... · {segment.startTime.toFixed(1)}s – {segment.endTime.toFixed(1)}s
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Segment Header with Inline Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Segment {segment.sequenceIndex + 1} Studio
            </h4>
            {/* Generation Method Badge */}
            {segment.generationMethod && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                segment.generationMethod === 'I2V' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                segment.generationMethod === 'EXT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                segment.generationMethod === 'FTV' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              )}>
                {segment.generationMethod}
              </span>
            )}
            {/* Trigger Reason Badge */}
            {segment.triggerReason && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 hidden sm:inline">
                • {segment.triggerReason}
              </span>
            )}
          </div>
          <p className={cn("text-xs font-medium", getStatusColor(segment.status))}>
            {displayStatus(segment.status)} · {segment.startTime.toFixed(1)}s – {segment.endTime.toFixed(1)}s
          </p>
        </div>
        
        {/* Generation Action Buttons - Inline Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Video Button */}
          <Button
            onClick={handleOpenVideoBuilder}
            disabled={segment.status === 'GENERATING'}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
          >
            {segment.status === 'GENERATING' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Video className="w-3.5 h-3.5" />
            )}
            Video
          </Button>
          
          {/* Image Button */}
          <Button
            onClick={handleOpenImageBuilder}
            disabled={segment.status === 'GENERATING'}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Image
          </Button>
          
          {/* Upload Button */}
          <label className="inline-flex cursor-pointer">
            <input type="file" className="hidden" accept="video/*,image/*" onChange={handleUploadChange} />
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${segment.status === 'GENERATING' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </span>
          </label>
          
          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 hidden sm:block" />
          
          {/* Details Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDetailDialogOpen(true)}
            className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400"
          >
            <Info className="w-3.5 h-3.5" />
            Details
          </Button>
          
          {/* Takes Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsTakesGalleryOpen(true)}
            className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400"
          >
            <Film className="w-3.5 h-3.5" />
            Takes ({segment.takes.length})
          </Button>
        </div>
      </div>

      {/* Video/Image Preview - Compact with expand option */}
      {segment.activeAssetUrl && (segment.status === 'COMPLETE' || segment.status === 'UPLOADED') && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-black max-w-md">
          {segment.assetType === 'video' ? (
            <video
              key={segment.activeAssetUrl}
              src={segment.activeAssetUrl}
              controls
              className="w-full aspect-video"
              poster={segment.takes[0]?.thumbnailUrl}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              src={segment.activeAssetUrl}
              alt={`Segment ${segment.sequenceIndex + 1} preview`}
              className="w-full aspect-video object-contain"
            />
          )}
          <div className="bg-gray-900 px-3 py-1.5 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">
              {segment.assetType === 'video' ? 'Video' : 'Image'} · Seg {segment.sequenceIndex + 1}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreenPreview(true)}
                className="text-[10px] text-gray-400 hover:text-white h-6 px-2"
              >
                <Maximize2 className="w-3 h-3 mr-1" />
                Expand
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTakesGalleryOpen(true)}
                className="text-[10px] text-gray-400 hover:text-white h-6 px-2"
              >
                Takes ({segment.takes.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Credits Estimate */}
      {typeof estimatedCredits === 'number' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-2 bg-white/50 dark:bg-gray-900/30">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Estimated cost: <span className="font-semibold text-sf-primary">{estimatedCredits.toFixed(2)} credits</span>
          </span>
        </div>
      )}

      {/* Segment Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Segment {segment.sequenceIndex + 1} Details</DialogTitle>
            <DialogDescription>
              {segment.startTime.toFixed(1)}s – {segment.endTime.toFixed(1)}s · Duration: {(segment.endTime - segment.startTime).toFixed(1)}s
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Veo 3.1 Generation Metadata - NEW */}
            {(segment.generationMethod || segment.triggerReason || segment.emotionalBeat) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {segment.generationMethod && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400 mb-1">Method</div>
                    <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
                      {segment.generationMethod === 'I2V' ? 'Image-to-Video' :
                       segment.generationMethod === 'EXT' ? 'Extend' :
                       segment.generationMethod === 'FTV' ? 'Frame-to-Video' :
                       segment.generationMethod === 'REF' ? 'Reference' : 'Text-to-Video'}
                    </div>
                  </div>
                )}
                {segment.triggerReason && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400 mb-1">Cut Trigger</div>
                    <div className="text-xs text-amber-900 dark:text-amber-100">{segment.triggerReason}</div>
                  </div>
                )}
                {segment.emotionalBeat && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="text-[10px] font-semibold uppercase text-purple-600 dark:text-purple-400 mb-1">Emotional Beat</div>
                    <div className="text-xs text-purple-900 dark:text-purple-100">{segment.emotionalBeat}</div>
                  </div>
                )}
                {segment.cameraMovement && (
                  <div className="bg-slate-50 dark:bg-slate-900/20 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">Camera</div>
                    <div className="text-xs text-slate-900 dark:text-slate-100">{segment.cameraMovement}</div>
                  </div>
                )}
              </div>
            )}

            {/* End Frame Description - Lookahead */}
            {segment.endFrameDescription && (
              <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-[10px] font-semibold uppercase text-green-600 dark:text-green-400 mb-1">End Frame (Lookahead for Next Segment)</div>
                <div className="text-sm text-green-900 dark:text-green-100">{segment.endFrameDescription}</div>
              </div>
            )}

            {/* Scene Segment Description */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Scene Segment Description</h3>
                {onOpenPromptBuilder && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenPromptBuilder()
                      setIsDetailDialogOpen(false)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Edit
                  </Button>
                )}
              </div>
              
              {promptSummary?.platform && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{promptSummary.platform}</span>
                  {promptSummary.promptType && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {promptSummary.promptType}
                    </span>
                  )}
                </div>
              )}
              
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                {promptSummary?.promptText || 'No description available. Generate or edit the segment description.'}
              </p>
              
              {(promptSummary?.characterNames?.length || promptSummary?.sceneRefNames?.length || promptSummary?.objectNames?.length) && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
                  <div>
                    <div className="font-semibold uppercase text-[11px] text-gray-500 dark:text-gray-400 mb-1">Characters</div>
                    <p className="text-gray-600 dark:text-gray-300">{promptSummary?.characterNames?.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <div className="font-semibold uppercase text-[11px] text-gray-500 dark:text-gray-400 mb-1">Scene Refs</div>
                    <p className="text-gray-600 dark:text-gray-300">{promptSummary?.sceneRefNames?.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <div className="font-semibold uppercase text-[11px] text-gray-500 dark:text-gray-400 mb-1">Objects</div>
                    <p className="text-gray-600 dark:text-gray-300">{promptSummary?.objectNames?.join(', ') || 'None'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Continuity */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Continuity</h3>
              <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                {previousSegmentLastFrame ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Previous segment has a last frame available for I2V</span>
                    </div>
                    <img src={previousSegmentLastFrame} alt="Previous frame" className="w-full max-w-xs rounded-md border border-gray-200 dark:border-gray-700" />
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">
                    No previous segment frame available. Use the Video button to access I2V, F2F, and Reference options.
                  </div>
                )}
              </div>
            </div>

            {/* Linked References */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Linked References</h3>
              <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg space-y-2">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">Characters:</span>{' '}
                  {references.characters.length > 0
                    ? references.characters.map((char: any) => char.name || char.id).join(', ')
                    : <span className="italic text-gray-400">None linked</span>}
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">Scene References:</span>{' '}
                  {references.sceneReferences.length > 0
                    ? references.sceneReferences.map((ref) => ref.name).join(', ')
                    : <span className="italic text-gray-400">None linked</span>}
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">Objects:</span>{' '}
                  {references.objectReferences.length > 0
                    ? references.objectReferences.map((ref) => ref.name).join(', ')
                    : <span className="italic text-gray-400">None linked</span>}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Takes Gallery Dialog */}
      <Dialog open={isTakesGalleryOpen} onOpenChange={(open) => {
        setIsTakesGalleryOpen(open)
        if (!open) setPlayingVideoUrl(null)
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Takes Gallery - Segment {segment.sequenceIndex + 1}</DialogTitle>
            <DialogDescription>
              All generated and uploaded takes for this segment. Click to play.
            </DialogDescription>
          </DialogHeader>
          
          {/* Video Player */}
          {playingVideoUrl && (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-4">
              <video
                src={playingVideoUrl}
                controls
                autoPlay
                className="w-full h-full"
              />
              <button
                onClick={() => setPlayingVideoUrl(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="py-4">
            {segment.takes.length === 0 ? (
              <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg py-12 text-sm text-gray-500 dark:text-gray-400 text-center">
                No takes yet. Generate or upload media to populate this gallery.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {segment.takes.map((take) => (
                  <div
                    key={take.id}
                    className={cn(
                      'border rounded-lg p-3 space-y-2 transition-all hover:shadow-lg cursor-pointer',
                      take.status === 'COMPLETE'
                        ? 'border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
                      playingVideoUrl === take.assetUrl && 'ring-2 ring-primary'
                    )}
                    onClick={() => take.assetUrl && setPlayingVideoUrl(take.assetUrl)}
                  >
                    <div className="aspect-video rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center relative group">
                      {take.thumbnailUrl ? (
                        <>
                          <img src={take.thumbnailUrl} alt="Take preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-10 h-10 text-white" />
                          </div>
                        </>
                      ) : take.assetUrl ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                          <Play className="w-10 h-10 text-white/80 group-hover:text-white transition-colors" />
                        </div>
                      ) : (
                        <Video className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{new Date(take.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="font-medium capitalize">Status: {take.status.toLowerCase()}</div>
                      {take.durationSec && <div>Duration: {take.durationSec}s</div>}
                      {take.notes && <div className="italic text-gray-400 text-xs">{take.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Preview Dialog */}
      <Dialog open={isFullscreenPreview} onOpenChange={setIsFullscreenPreview}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 bg-black">
          <button
            onClick={() => setIsFullscreenPreview(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {segment.activeAssetUrl && (
            segment.assetType === 'video' ? (
              <video
                key={segment.activeAssetUrl}
                src={segment.activeAssetUrl}
                controls
                autoPlay
                className="w-full h-full max-h-[85vh] object-contain"
              />
            ) : (
              <img
                src={segment.activeAssetUrl}
                alt={`Segment ${segment.sequenceIndex + 1} fullscreen`}
                className="w-full h-full max-h-[85vh] object-contain"
              />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* New Segment Prompt Builder (replaces ShotPromptBuilder) */}
      {segment && (
        <SegmentPromptBuilder
          open={isPromptBuilderOpen}
          onClose={() => setIsPromptBuilderOpen(false)}
          segment={segment}
          mode={promptBuilderMode}
          availableCharacters={references.characters}
          sceneImageUrl={sceneImageUrl}
          previousSegmentLastFrame={previousSegmentLastFrame}
          onGenerate={handlePromptBuilderGenerate}
          isGenerating={segment.status === 'GENERATING'}
        />
      )}
    </div>
  )
}
