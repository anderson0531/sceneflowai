'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SceneSegment, SceneProductionReferences, SceneSegmentStatus } from './types'
import { Upload, Video, Image as ImageIcon, CheckCircle2, Link as LinkIcon, Sparkles, Loader2, Info, Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ShotPromptBuilder } from '../ShotPromptBuilder'
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
  onGenerate: (mode: GenerationType, options?: { startFrameUrl?: string }) => Promise<void>
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
  const [generationType, setGenerationType] = useState<GenerationType>('T2V')
  const [startFrameUrl, setStartFrameUrl] = useState<string | null>(null)
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isTakesGalleryOpen, setIsTakesGalleryOpen] = useState(false)
  
  // Prompt Builder State
  const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false)
  const [promptBuilderMode, setPromptBuilderMode] = useState<'image' | 'video'>('video')

  useEffect(() => {
    if (promptSummary?.promptType) {
      setGenerationType(promptSummary.promptType)
    } else if (previousSegmentLastFrame) {
      setGenerationType('I2V')
      setStartFrameUrl(previousSegmentLastFrame)
    } else {
      setGenerationType('T2V')
      setStartFrameUrl(null)
    }
  }, [segment?.segmentId, previousSegmentLastFrame, promptSummary?.promptType])

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

  const handleUseLastFrame = () => {
    if (previousSegmentLastFrame) {
      setStartFrameUrl(previousSegmentLastFrame)
      setGenerationType('I2V')
    }
  }

  const handleSelectAsset = (url: string) => {
    setStartFrameUrl(url)
    setGenerationType('I2V')
    setIsAssetSelectorOpen(false)
  }

  const handleGenerateClick = async () => {
    if (generationType === 'UPLOAD') {
      return
    }
    
    const mode = generationType === 'T2I' ? 'image' : 'video'
    setPromptBuilderMode(mode)
    setIsPromptBuilderOpen(true)
  }
  
  const handlePromptBuilderGenerate = async (promptData: any) => {
    await onGenerate(generationType, { 
      startFrameUrl: startFrameUrl || undefined,
      ...promptData 
    })
  }

  const handleGenerationTypeChange = (value: string) => {
    const newType = value as GenerationType
    setGenerationType(newType)
    if (newType !== 'I2V') {
      setStartFrameUrl(null)
    } else if (previousSegmentLastFrame && !startFrameUrl) {
      setStartFrameUrl(previousSegmentLastFrame)
    }
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
                {generationType === 'T2V' ? 'Text-to-Video' : generationType === 'I2V' ? 'Image-to-Video (Continuity)' : 'Text-to-Image'} · {segment.startTime.toFixed(1)}s – {segment.endTime.toFixed(1)}s
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Segment {segment.sequenceIndex + 1} Studio
          </h4>
          <p className={cn("text-xs font-medium", getStatusColor(segment.status))}>
            {displayStatus(segment.status)} · {segment.startTime.toFixed(1)}s – {segment.endTime.toFixed(1)}s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDetailDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Info className="w-4 h-4" />
            Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTakesGalleryOpen(true)}
            className="flex items-center gap-2"
          >
            <Film className="w-4 h-4" />
            Takes ({segment.takes.length})
          </Button>
          {onOpenScenePreview && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenScenePreview}
              className="flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              Preview
            </Button>
          )}
        </div>
      </div>

      {/* Generation Controls - Compact Layout */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white/70 dark:bg-gray-900/40 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2 block uppercase tracking-wide">
              Generation Type
            </label>
            <Select value={generationType} onValueChange={handleGenerationTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="T2V">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    <span>AI Video (Text-to-Video)</span>
                  </div>
                </SelectItem>
                <SelectItem value="I2V">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    <span>AI Video (Image-to-Video)</span>
                  </div>
                </SelectItem>
                <SelectItem value="T2I">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    <span>AI Image (Text-to-Image)</span>
                  </div>
                </SelectItem>
                <SelectItem value="UPLOAD">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>Upload Media</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2 block uppercase tracking-wide">
              Action
            </label>
            {generationType === 'UPLOAD' ? (
              <label className="inline-flex w-full">
                <input type="file" className="hidden" accept="video/*,image/*" onChange={handleUploadChange} />
                <Button type="button" variant="outline" className="w-full flex items-center gap-2 justify-center h-10">
                  <Upload className="w-4 h-4" />
                  Upload Media
                </Button>
              </label>
            ) : (
              <Button
                onClick={handleGenerateClick}
                className="w-full flex items-center gap-2 justify-center h-10"
                disabled={segment?.status === 'GENERATING'}
              >
                {segment?.status === 'GENERATING' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : generationType === 'T2V' || generationType === 'I2V' ? (
                  <>
                    <Video className="w-4 h-4" />
                    Generate Video
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    Generate Image
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {generationType === 'I2V' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-200 block uppercase tracking-wide">
              Start Frame (Continuity)
            </label>
            
            {startFrameUrl ? (
              <div className="relative aspect-video rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 group">
                <img src={startFrameUrl} alt="Start frame" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setIsAssetSelectorOpen(true)}>
                    Change
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setStartFrameUrl(null)}>
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full h-24 border-dashed flex flex-col gap-2"
                onClick={() => setIsAssetSelectorOpen(true)}
              >
                <ImageIcon className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-500">Select Start Frame</span>
              </Button>
            )}
          </div>
        )}

        {previousSegmentLastFrame && generationType !== 'UPLOAD' && (
          <Button
            variant="outline"
            onClick={handleUseLastFrame}
            disabled={startFrameUrl === previousSegmentLastFrame}
            className="w-full flex items-center gap-2"
            size="sm"
          >
            <LinkIcon className="w-4 h-4" />
            {startFrameUrl === previousSegmentLastFrame
              ? 'Using Previous Clip\'s Last Frame'
              : 'Use Previous Clip\'s Last Frame'}
          </Button>
        )}

        {typeof estimatedCredits === 'number' && (
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
            Estimated cost: <span className="font-semibold text-sf-primary">{estimatedCredits.toFixed(2)} credits</span>
          </div>
        )}
      </div>

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
                {startFrameUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Start frame set for continuity</span>
                    </div>
                    <img src={startFrameUrl} alt="Start frame" className="w-full max-w-xs rounded-md border border-gray-200 dark:border-gray-700" />
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">
                    No start frame set. This will be a standard text-to-video generation.
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
      <Dialog open={isTakesGalleryOpen} onOpenChange={setIsTakesGalleryOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Takes Gallery - Segment {segment.sequenceIndex + 1}</DialogTitle>
            <DialogDescription>
              All generated and uploaded takes for this segment
            </DialogDescription>
          </DialogHeader>
          
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
                      'border rounded-lg p-3 space-y-2 transition-all hover:shadow-lg',
                      take.status === 'COMPLETE'
                        ? 'border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                    )}
                  >
                    <div className="aspect-video rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                      {take.thumbnailUrl ? (
                        <img src={take.thumbnailUrl} alt="Take preview" className="w-full h-full object-cover" />
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
                      {take.notes && <div className="italic text-gray-400 text-xs">{take.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Shot Prompt Builder */}
      {segment && (
        <ShotPromptBuilder
          open={isPromptBuilderOpen}
          onClose={() => setIsPromptBuilderOpen(false)}
          segment={segment}
          mode={promptBuilderMode}
          availableCharacters={references.characters}
          onGenerate={handlePromptBuilderGenerate}
          isGenerating={segment.status === 'GENERATING'}
        />
      )}

      {/* Asset Selector Dialog */}
      <Dialog open={isAssetSelectorOpen} onOpenChange={setIsAssetSelectorOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Select Start Frame</DialogTitle>
            <DialogDescription>
              Choose an image to use as the starting frame for video generation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            {sceneImageUrl && (
              <div 
                className="cursor-pointer group relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                onClick={() => handleSelectAsset(sceneImageUrl)}
              >
                <img src={sceneImageUrl} alt="Scene Master" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white font-medium">Use Scene Master</span>
                </div>
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  Scene Master
                </div>
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center gap-2 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-500 font-medium">Upload Custom Frame</span>
              <span className="text-xs text-gray-400 text-center">Click to browse</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
