'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/Input'
import { SceneSegment, SceneProductionReferences, SceneSegmentStatus } from './types'
import { Upload, Video, Image as ImageIcon, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SegmentStudioProps {
  segment: SceneSegment | null
  onPromptChange: (prompt: string) => void
  onGenerate: (mode: 'video' | 'image') => Promise<void>
  onUploadMedia: (file: File) => Promise<void>
  references: SceneProductionReferences
  estimatedCredits?: number | null
}

export function SegmentStudio({
  segment,
  onPromptChange,
  onGenerate,
  onUploadMedia,
  references,
  estimatedCredits,
}: SegmentStudioProps) {
  const [promptDraft, setPromptDraft] = useState(segment?.userEditedPrompt ?? segment?.generatedPrompt ?? '')

  useEffect(() => {
    setPromptDraft(segment?.userEditedPrompt ?? segment?.generatedPrompt ?? '')
  }, [segment?.segmentId, segment?.userEditedPrompt, segment?.generatedPrompt])

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

          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => onGenerate('video')} className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Generate Video
            </Button>
            <Button variant="secondary" onClick={() => onGenerate('image')} className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Generate Image
            </Button>
            <label className="inline-flex">
              <input type="file" className="hidden" accept="video/*,image/*" onChange={handleUploadChange} />
              <Button type="button" variant="outline" className="w-full flex items-center gap-2 justify-center">
                <Upload className="w-4 h-4" />
                Upload Media
              </Button>
            </label>
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
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Start Frame</label>
                  <Input type="file" accept="image/*" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">End Frame</label>
                  <Input type="file" accept="image/*" />
                </div>
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

