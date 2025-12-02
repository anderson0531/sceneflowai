'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SceneSegment, SceneProductionReferences, SceneSegmentStatus } from './types'
import { Upload, Video, Image as ImageIcon, CheckCircle2, Film, Link as LinkIcon, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ShotPromptBuilder } from '../ShotPromptBuilder'

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
  references: SceneProductionReferences
  estimatedCredits?: number | null
  promptSummary?: SegmentPromptSummary | null
  onOpenPromptBuilder?: () => void
  onOpenScenePreview?: () => void
}

export function SegmentStudio({
  segment,
  previousSegmentLastFrame,
  onGenerate,
  onUploadMedia,
  references,
  estimatedCredits,
  promptSummary,
  onOpenPromptBuilder,
  onOpenScenePreview,
}: SegmentStudioProps) {
  const [generationType, setGenerationType] = useState<GenerationType>('T2V')
  const [startFrameUrl, setStartFrameUrl] = useState<string | null>(null)
  
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

  const handleGenerateClick = async () => {
    if (generationType === 'UPLOAD') {
      // Upload is handled separately via file input
      return
    }
    
    // Open Prompt Builder instead of direct generation
    const mode = generationType === 'T2I' ? 'image' : 'video'
    setPromptBuilderMode(mode)
    setIsPromptBuilderOpen(true)
  }
  
  const handlePromptBuilderGenerate = async (promptData: any) => {
    // Map promptData back to generation parameters
    // promptData contains: prompt, negativePrompt, duration, transition, etc.
    // We might need to pass these to onGenerate if it supports them
    // For now, we'll just pass the prompt text if onGenerate only takes simple options
    // But ideally onGenerate should accept the full promptData object.
    // Since onGenerate signature is (mode, options), I'll pass promptData in options.
    
    await onGenerate(generationType, { 
      startFrameUrl: startFrameUrl || undefined,
      ...promptData 
    })
  }

  const handleGenerationTypeChange = (value: string) => {
    const newType = value as GenerationType
    setGenerationType(newType)
    // If switching away from I2V, clear start frame
    if (newType !== 'I2V') {
      setStartFrameUrl(null)
    } else if (previousSegmentLastFrame && !startFrameUrl) {
      // If switching to I2V and we have a previous frame, use it
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Segment {segment.sequenceIndex + 1} Studio
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {displayStatus(segment.status)} · {segment.startTime.toFixed(1)}s – {segment.endTime.toFixed(1)}s
          </p>
        </div>
        {onOpenScenePreview && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenScenePreview}
            className="flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            Preview Scene
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white/70 dark:bg-gray-900/40 space-y-4">
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
                      <span>AI Video (Image-to-Video - Continuity)</span>
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

            {/* Continuity Button */}
            {previousSegmentLastFrame && generationType !== 'UPLOAD' && (
              <Button
                variant="outline"
                onClick={handleUseLastFrame}
                disabled={startFrameUrl === previousSegmentLastFrame}
                className="w-full flex items-center gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                {startFrameUrl === previousSegmentLastFrame
                  ? 'Using Previous Clip\'s Last Frame'
                  : 'Use Previous Clip\'s Last Frame (I2V)'}
              </Button>
            )}

            {/* Generate/Upload Buttons */}
            <div>
              {generationType === 'UPLOAD' ? (
                <label className="inline-flex w-full">
                  <input type="file" className="hidden" accept="video/*,image/*" onChange={handleUploadChange} />
                  <Button type="button" variant="outline" className="w-full flex items-center gap-2 justify-center">
                    <Upload className="w-4 h-4" />
                    Upload Media
                  </Button>
                </label>
              ) : (
                <Button
                  onClick={handleGenerateClick}
                  className="w-full flex items-center gap-2 justify-center"
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

            {/* Start Frame Preview for I2V */}
            {generationType === 'I2V' && startFrameUrl && (
              <div className="p-3 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
                  Continuity Frame:
                </div>
                <img
                  src={startFrameUrl}
                  alt="Start frame for continuity"
                  className="w-full h-24 object-cover rounded border border-blue-300 dark:border-blue-700"
                />
              </div>
            )}

            {typeof estimatedCredits === 'number' && (
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                Estimated cost: <span className="font-semibold text-sf-primary">{estimatedCredits.toFixed(2)} credits</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white/70 dark:bg-gray-900/40">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Scene Segment Description</div>
                <div className="flex items-center gap-3 flex-wrap">
                  {promptSummary?.platform && (
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {promptSummary.platform}
                    </div>
                  )}
                  {promptSummary?.promptType && (
                    <div className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {promptSummary.promptType}
                    </div>
                  )}
                </div>
              </div>
              {onOpenPromptBuilder && (
                <Button
                  size="sm"
                  onClick={onOpenPromptBuilder}
                  className="flex items-center gap-2 flex-shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  Edit Description
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 whitespace-pre-line min-h-[96px]">
              {promptSummary?.promptText || 'Generate or edit the scene segment description to see it here. This description is used to generate video and image prompts.'}
            </p>
            {(promptSummary?.characterNames?.length ||
              promptSummary?.sceneRefNames?.length ||
              promptSummary?.objectNames?.length) && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs text-gray-600 dark:text-gray-400">
                <div>
                  <div className="font-semibold uppercase text-[11px] text-gray-500 dark:text-gray-400 mb-1">Characters</div>
                  <p>{promptSummary?.characterNames?.join(', ') || 'None selected'}</p>
                </div>
                <div>
                  <div className="font-semibold uppercase text-[11px] text-gray-500 dark:text-gray-400 mb-1">Scene refs</div>
                  <p>{promptSummary?.sceneRefNames?.join(', ') || 'None selected'}</p>
                </div>
                <div>
                  <div className="font-semibold uppercase text-[11px] text-gray-500 dark:text-gray-400 mb-1">Objects</div>
                  <p>{promptSummary?.objectNames?.join(', ') || 'None selected'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white/70 dark:bg-gray-900/40 space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-2 tracking-wide">Continuity</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {startFrameUrl ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Start frame set for continuity</span>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">
                    No start frame set. This will be a standard text-to-video generation.
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-2 tracking-wide">Linked References</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-300">Characters:</span>{' '}
                  {references.characters.length > 0
                    ? references.characters.map((char: any) => char.name || char.id).join(', ')
                    : <span className="italic text-gray-400">Drag a character from the sidebar</span>}
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-300">Scene refs:</span>{' '}
                  {references.sceneReferences.length > 0
                    ? references.sceneReferences.map((ref) => ref.name).join(', ')
                    : <span className="italic text-gray-400">Drag scene references here</span>}
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-300">Objects:</span>{' '}
                  {references.objectReferences.length > 0
                    ? references.objectReferences.map((ref) => ref.name).join(', ')
                    : <span className="italic text-gray-400">Drag object references here</span>}
                </div>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 italic mt-2">
                Drag references from the sidebar to anchor this segment&apos;s look and props.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white/70 dark:bg-gray-900/40">
        <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Takes Gallery</h5>
        {segment.takes.length === 0 ? (
          <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
            No takes yet. Generate or upload media to populate this gallery.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {segment.takes.map((take) => (
              <div
                key={take.id}
                className={cn(
                  'border rounded-lg p-3 space-y-2 transition-all hover:shadow-md',
                  take.status === 'COMPLETE'
                    ? 'border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                )}
              >
                <div className="aspect-video rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                  {take.thumbnailUrl ? (
                    <img src={take.thumbnailUrl} alt="Take preview" className="w-full h-full object-cover" />
                  ) : (
                    <Video className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>{new Date(take.createdAt).toLocaleString()}</span>
                  </div>
                  <div>Status: {take.status.toLowerCase()}</div>
                  {take.notes ? <div className="italic text-gray-400">{take.notes}</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Render ShotPromptBuilder */}
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
    </div>
  )
}

