'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SegmentTimeline } from './SegmentTimeline'
import { SegmentStudio } from './SegmentStudio'
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
  onGenerate: (sceneId: string, segmentId: string, mode: 'video' | 'image') => Promise<void>
  onUpload: (sceneId: string, segmentId: string, file: File) => Promise<void>
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

  const selectedSegment: SceneSegment | null =
    segments.find((segment) => segment.segmentId === selectedSegmentId) ?? null

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

  const handlePromptChange = (prompt: string) => {
    if (!selectedSegment) return
    onPromptChange(sceneId, selectedSegment.segmentId, prompt)
  }

  const handleGenerate = async (mode: 'video' | 'image') => {
    if (!selectedSegment) return
    await onGenerate(sceneId, selectedSegment.segmentId, mode)
  }

  const handleUpload = async (file: File) => {
    if (!selectedSegment) return
    await onUpload(sceneId, selectedSegment.segmentId, file)
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
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Scene {sceneNumber}: {heading || 'Untitled'}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {productionData.segments.length} segments · Target {productionData.targetSegmentDuration}s
        </p>
      </div>

      <SegmentTimeline
        segments={segments}
        selectedSegmentId={selectedSegmentId ?? undefined}
        onSelect={setSelectedSegmentId}
      />

      <SegmentStudio
        segment={selectedSegment}
        onPromptChange={handlePromptChange}
        onGenerate={handleGenerate}
        onUploadMedia={handleUpload}
        references={references}
      />
    </div>
  )
}

