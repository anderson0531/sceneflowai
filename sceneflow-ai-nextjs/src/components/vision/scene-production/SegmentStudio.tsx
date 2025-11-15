'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SceneSegment, SceneProductionReferences, SceneSegmentStatus } from './types'
import { Upload, Video, Image as ImageIcon, CheckCircle2, Film, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type GenerationType = 'T2V' | 'I2V' | 'T2I' | 'UPLOAD'

interface SegmentStudioProps {
  segment: SceneSegment | null
  previousSegmentLastFrame?: string | null
  onPromptChange: (prompt: string) => void
  onGenerate: (mode: GenerationType, options?: { startFrameUrl?: string }) => Promise<void>
  onUploadMedia: (file: File) => Promise<void>
  references: SceneProductionReferences
  estimatedCredits?: number | null
}

export function SegmentStudio({
  segment,
  previousSegmentLastFrame,
  onPromptChange,
  onGenerate,
  onUploadMedia,
  references,
  estimatedCredits,
}: SegmentStudioProps) {
  const [promptDraft, setPromptDraft] = useState(segment?.userEditedPrompt ?? segment?.generatedPrompt ?? '')
  const [generationType, setGenerationType] = useState<GenerationType>('T2V')
  const [startFrameUrl, setStartFrameUrl] = useState<string | null>(null)

  useEffect(() => {
    setPromptDraft(segment?.userEditedPrompt ?? segment?.generatedPrompt ?? '')
    // Determine default generation type based on segment recommendations or previous frame availability
    if (previousSegmentLastFrame) {
      setGenerationType('I2V')
      setStartFrameUrl(previousSegmentLastFrame)
    } else {
      setGenerationType('T2V')
      setStartFrameUrl(null)
    }
  }, [segment?.segmentId, segment?.userEditedPrompt, segment?.generatedPrompt, previousSegmentLastFrame])

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

  const handlePromptBlur = () => {
    if (promptDraft !== undefined) {
      onPromptChange(promptDraft)
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
    await onGenerate(generationType, { startFrameUrl: startFrameUrl || undefined })
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
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Segment {segment.sequenceIndex + 1} Studio
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {displayStatus(segment.status)} · {segment.startTime.toFixed(1)}s – {segment.endTime.toFixed(1)}s
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="aspect-video rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-950/5 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
            {segment.activeAssetUrl ? (
              <video
                src={segment.activeAssetUrl}
                controls
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center px-6">
                No active take yet. Generate a clip or upload custom footage to preview continuity.
              </div>
            )}
          </div>

          <div className="space-y-3">
            {/* Generation Type Selector */}
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2 block">
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
            <div className="grid grid-cols-2 gap-2">
              {generationType === 'UPLOAD' ? (
                <label className="inline-flex col-span-2">
                  <input type="file" className="hidden" accept="video/*,image/*" onChange={handleUploadChange} />
                  <Button type="button" variant="outline" className="w-full flex items-center gap-2 justify-center">
                    <Upload className="w-4 h-4" />
                    Upload Media
                  </Button>
                </label>
              ) : (
                <Button
                  onClick={handleGenerateClick}
                  className="flex items-center gap-2 col-span-2"
                  disabled={segment?.status === 'GENERATING'}
                >
                  {generationType === 'T2V' || generationType === 'I2V' ? (
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
              <div className="mt-2 p-2 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">
                  Continuity Frame:
                </div>
                <img
                  src={startFrameUrl}
                  alt="Start frame for continuity"
                  className="w-full h-24 object-cover rounded border border-blue-300 dark:border-blue-700"
                />
              </div>
            )}
          </div>

          {typeof estimatedCredits === 'number' ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Estimated cost: <span className="font-semibold text-sf-primary">{estimatedCredits.toFixed(2)} credits</span>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 block">
              AI Prompt
            </label>
            <Textarea
              value={promptDraft}
              onChange={(event) => setPromptDraft(event.target.value)}
              onBlur={handlePromptBlur}
              rows={12}
              placeholder="Describe the visuals, camera, and emotional beats for this segment."
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Continuity</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {startFrameUrl ? (
                  <div className="space-y-1">
                    <div className="text-green-600 dark:text-green-400">✓ Start frame set for continuity</div>
                    {segment.references.startFrameUrl && (
                      <div className="text-gray-600 dark:text-gray-400">
                        Frame from previous segment will be used for seamless transition.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">
                    No start frame set. This will be a standard text-to-video generation.
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Linked References</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-300">Characters:</span>{' '}
                  {references.characters.length > 0
                    ? references.characters.map((char: any) => char.name || char.id).join(', ')
                    : 'Drag a character from the sidebar'}
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-300">Scene refs:</span>{' '}
                  {references.sceneReferences.length > 0
                    ? references.sceneReferences.map((ref) => ref.name).join(', ')
                    : 'Drag scene references here'}
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-300">Objects:</span>{' '}
                  {references.objectReferences.length > 0
                    ? references.objectReferences.map((ref) => ref.name).join(', ')
                    : 'Drag object references here'}
                </div>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 italic">
                Drag references from the sidebar to anchor this segment&apos;s look and props.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Takes Gallery</h5>
        {segment.takes.length === 0 ? (
          <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
            No takes yet. Generate or upload media to populate this gallery.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {segment.takes.map((take) => (
              <div
                key={take.id}
                className={cn(
                  'border rounded-lg p-3 space-y-2',
                  take.status === 'COMPLETE'
                    ? 'border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-800'
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
    </div>
  )
}

