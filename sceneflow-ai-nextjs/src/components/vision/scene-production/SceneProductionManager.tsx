'use client'

import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SegmentTimeline } from './SegmentTimeline'
import { SegmentStudio, GenerationType } from './SegmentStudio'
import {
  SceneProductionData,
  SceneProductionReferences,
  SceneSegment,
} from './types'
import { Calculator, Sparkles } from 'lucide-react'

interface SceneProductionManagerProps {
  sceneId: string
  sceneNumber: number
  heading?: string
  productionData?: SceneProductionData | null
  references: SceneProductionReferences
  onInitialize: (sceneId: string, options: { targetDuration: number }) => Promise<void>
  onPromptChange: (sceneId: string, segmentId: string, prompt: string) => void
  onGenerate: (sceneId: string, segmentId: string, mode: GenerationType, options?: { startFrameUrl?: string }) => Promise<void>
  onUpload: (sceneId: string, segmentId: string, file: File) => Promise<void>
  audioTracks?: {
    narration?: { url?: string; startTime: number; duration: number }
    dialogue?: Array<{ url?: string; startTime: number; duration: number; character?: string }>
    sfx?: Array<{ url?: string; startTime: number; duration: number; description?: string }>
    music?: { url?: string; startTime: number; duration: number }
  }
}

export function SceneProductionManager({
  sceneId,
  sceneNumber,
  heading,
  productionData,
  references,
  onInitialize,
  onPromptChange,
  onGenerate,
  onUpload,
  audioTracks,
}: SceneProductionManagerProps) {
  const [targetDuration, setTargetDuration] = useState<number>(productionData?.targetSegmentDuration ?? 8)
  useEffect(() => {
    if (productionData?.targetSegmentDuration) {
      setTargetDuration(productionData.targetSegmentDuration)
    }
  }, [productionData?.targetSegmentDuration])

  const [isInitializing, setIsInitializing] = useState(false)
  const segments = productionData?.segments ?? []
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(segments[0]?.segmentId ?? null)

  useEffect(() => {
    if (segments.length > 0) {
      if (!selectedSegmentId || !segments.some((segment) => segment.segmentId === selectedSegmentId)) {
        setSelectedSegmentId(segments[0].segmentId)
      }
    } else {
      setSelectedSegmentId(null)
    }
  }, [segments, selectedSegmentId])


  const handleInitialize = async () => {
    setIsInitializing(true)
    try {
      await onInitialize(sceneId, { targetDuration })
    } catch (error) {
      console.error('[SceneProduction] Initialize failed', error)
      try {
        const { toast } = require('sonner')
        toast.error(error instanceof Error ? error.message : 'Failed to initialize scene production')
      } catch {}
    } finally {
      setIsInitializing(false)
    }
  }

  const selectedSegment = segments.find((segment) => segment.segmentId === selectedSegmentId) ?? null

  // Calculate previous segment's last frame for continuity
  const previousSegmentLastFrame = useMemo(() => {
    if (!selectedSegment || !selectedSegmentId) return null
    const currentIndex = segments.findIndex(s => s.segmentId === selectedSegmentId)
    if (currentIndex <= 0) return null
    const prevSegment = segments[currentIndex - 1]
    return prevSegment?.takes?.[0]?.assetUrl ?? prevSegment?.activeAssetUrl ?? null
  }, [segments, selectedSegmentId])

  const handlePromptChange = (prompt: string) => {
    if (!selectedSegment) return
    onPromptChange(sceneId, selectedSegment.segmentId, prompt)
  }

  const handleGenerate = async (mode: GenerationType, options?: { startFrameUrl?: string }) => {
    if (!selectedSegment) return
    try {
      await onGenerate(sceneId, selectedSegment.segmentId, mode, options)
    } catch (error) {
      console.error('[SceneProduction] Generation failed', error)
      try {
        const { toast } = require('sonner')
        toast.error(error instanceof Error ? error.message : 'Failed to generate')
      } catch {}
    }
  }

  const handleUpload = async (file: File) => {
    if (!selectedSegment) return
    try {
      await onUpload(sceneId, selectedSegment.segmentId, file)
    } catch (error) {
      console.error('[SceneProduction] Upload failed', error)
      try {
        const { toast } = require('sonner')
        toast.error(error instanceof Error ? error.message : 'Failed to upload file')
      } catch {}
    }
  }


  if (!productionData || !productionData.isSegmented || productionData.segments.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Initialize Scene Production
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Break this scene into generation-ready segments. We’ll analyze the direction & script to propose
          keyframes and produce expert prompts for each cut.
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300 flex flex-col gap-1">
            Target Segment Duration (seconds)
            <Input
              type="number"
              min={4}
              step={0.5}
              value={targetDuration}
              onChange={(event) => setTargetDuration(Number(event.target.value))}
              className="w-32"
            />
          </label>
          <Button onClick={handleInitialize} disabled={isInitializing} className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {isInitializing ? 'Initializing…' : 'Initialize Segments & Prompts'}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          We’ll balance keyframes with natural breaks to keep continuity tight across segments.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Scene {sceneNumber}: {heading || 'Untitled'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {productionData.segments.length} segments · Target {productionData.targetSegmentDuration}s
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {productionData?.isSegmented && (
              <Button
                variant="outline"
                size="sm"
                disabled={isInitializing}
                onClick={async () => {
                  const confirmed = typeof window !== 'undefined'
                    ? window.confirm('Regenerate segments from the latest script and direction? This will replace current segments.')
                    : true
                  if (!confirmed) return
                  await handleInitialize()
                }}
                className="shrink-0"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate Segments
              </Button>
            )}
          </div>
        </div>

        {/* Selected Segment Description */}
        {selectedSegment && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Segment {selectedSegment.sequenceIndex + 1} Description
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {(selectedSegment as any).visualBeat || 
               selectedSegment.userEditedPrompt || 
               selectedSegment.generatedPrompt || 
               'No description available for this segment.'}
            </p>
          </div>
        )}

        <SegmentTimeline
          segments={segments}
          selectedSegmentId={selectedSegmentId ?? undefined}
          onSelect={setSelectedSegmentId}
          audioTracks={audioTracks}
        />

        <SegmentStudio
          segment={selectedSegment}
          previousSegmentLastFrame={previousSegmentLastFrame}
          onPromptChange={handlePromptChange}
          onGenerate={handleGenerate}
          onUploadMedia={handleUpload}
          references={references}
        />
      </div>
    </>
  )
}

