'use client'

import React, { useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2 } from 'lucide-react'
import { SceneTimelineData, CreationTimelineClip } from './types'

interface SceneTimelineProps {
  sceneId: string
  clips: CreationTimelineClip[]
  onClipsChange: (next: CreationTimelineClip[]) => void
  narrationUrl?: string
  musicUrl?: string
  dialogueClips?: CreationTimelineClip[]
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0.0s'
  return `${seconds.toFixed(1)}s`
}

function normalizeClips(clips: CreationTimelineClip[]): CreationTimelineClip[] {
  let cursor = 0
  return clips.map((clip) => {
    const duration = Math.max(0.5, clip.timelineDuration || (clip.sourceOutPoint - clip.sourceInPoint))
    const nextClip: CreationTimelineClip = {
      ...clip,
      timelineDuration: duration,
      startTime: cursor,
      sourceInPoint: Math.max(0, clip.sourceInPoint),
      sourceOutPoint: Math.max(clip.sourceInPoint + 0.5, clip.sourceOutPoint),
    }
    cursor += duration
    return nextClip
  })
}

interface SortableClipProps {
  clip: CreationTimelineClip
  onTrimChange: (clipId: string, field: 'sourceInPoint' | 'sourceOutPoint', value: number) => void
  onRemove: (clipId: string) => void
}

function SortableClip({ clip, onTrimChange, onRemove }: SortableClipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: clip.assetId })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-3 flex flex-col gap-3 ${isDragging ? 'opacity-80 ring-2 ring-blue-400' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-300">{clip.label || 'Untitled Clip'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Start {formatTime(clip.startTime)} • Duration {formatTime(clip.timelineDuration)}
          </div>
        </div>
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          title="Drag to reorder"
        >
          ≡
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-gray-500 dark:text-gray-400 uppercase tracking-wide">In Point</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={clip.sourceInPoint.toFixed(1)}
            onChange={(event) => onTrimChange(clip.assetId, 'sourceInPoint', Number(event.target.value))}
            className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-500 dark:text-gray-400 uppercase tracking-wide">Out Point</span>
          <input
            type="number"
            min={clip.sourceInPoint + 0.5}
            step={0.1}
            value={clip.sourceOutPoint.toFixed(1)}
            onChange={(event) => onTrimChange(clip.assetId, 'sourceOutPoint', Number(event.target.value))}
            className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => onRemove(clip.assetId)}
        className="mt-1 inline-flex items-center gap-2 text-xs text-red-500 hover:text-red-600"
      >
        <Trash2 className="w-3 h-3" /> Remove from timeline
      </button>
    </div>
  )
}

export function SceneTimeline({ sceneId, clips, onClipsChange, narrationUrl, musicUrl, dialogueClips }: SceneTimelineProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }))
  const normalizedClips = useMemo(() => normalizeClips(clips), [clips])
  const totalDuration = normalizedClips.reduce((sum, clip) => sum + clip.timelineDuration, 0)
  const [activeClipId, setActiveClipId] = useState<string | null>(null)

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const fromIndex = normalizedClips.findIndex((clip) => clip.assetId === active.id)
    const toIndex = normalizedClips.findIndex((clip) => clip.assetId === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    const nextClips = normalizeClips(arrayMove(normalizedClips, fromIndex, toIndex))
    onClipsChange(nextClips)
  }

  const handleTrimChange = (clipId: string, field: 'sourceInPoint' | 'sourceOutPoint', rawValue: number) => {
    const nextClips = normalizedClips.map((clip) => {
      if (clip.assetId !== clipId) return clip
      const value = Number.isFinite(rawValue) ? Math.max(0, rawValue) : clip[field]
      if (field === 'sourceInPoint') {
        const nextOut = Math.max(value + 0.5, clip.sourceOutPoint)
        return {
          ...clip,
          sourceInPoint: value,
          sourceOutPoint: nextOut,
          timelineDuration: nextOut - value,
        }
      }
      const nextOut = Math.max(value, clip.sourceInPoint + 0.5)
      return {
        ...clip,
        sourceOutPoint: nextOut,
        timelineDuration: nextOut - clip.sourceInPoint,
      }
    })
    onClipsChange(normalizeClips(nextClips))
  }

  const handleRemoveClip = (clipId: string) => {
    const nextClips = normalizedClips.filter((clip) => clip.assetId !== clipId)
    onClipsChange(normalizeClips(nextClips))
  }

  return (
    <section className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Scene Timeline</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Track 1 is editable. Audio tracks from Vision are locked in place.</p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Total Runtime {formatTime(totalDuration)}</div>
      </header>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Track 1 • Visuals</span>
          <span>{normalizedClips.length} clip{normalizedClips.length === 1 ? '' : 's'}</span>
        </div>
        {normalizedClips.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Add takes from the Scene Assets panel to begin sequencing this scene.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={(event) => setActiveClipId(event.active.id)} onDragCancel={() => setActiveClipId(null)}>
            <SortableContext items={normalizedClips.map((clip) => clip.assetId)} strategy={horizontalListSortingStrategy}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {normalizedClips.map((clip) => (
                  <SortableClip key={clip.assetId} clip={clip} onTrimChange={handleTrimChange} onRemove={handleRemoveClip} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="space-y-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600 dark:text-gray-300">Track 2 • Dialogue &amp; SFX</span>
          {dialogueClips && dialogueClips.length > 0 ? <span>{dialogueClips.length} clip{dialogueClips.length === 1 ? '' : 's'}</span> : <span>Locked to Veo output</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600 dark:text-gray-300">Track 3 • Narration</span>
          {narrationUrl ? <span>Attached from Vision phase</span> : <span>Not linked</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600 dark:text-gray-300">Track 4 • Music</span>
          {musicUrl ? <span>Background score ready</span> : <span>Not linked</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600 dark:text-gray-300">Track 5 • User Audio</span>
          <span>Drop-in custom audio clips from Scene Assets.</span>
        </div>
      </div>
    </section>
  )
}

export default SceneTimeline
