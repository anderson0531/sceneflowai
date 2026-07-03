'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'
import { Check, ImageIcon, AlertTriangle, Clock } from 'lucide-react'
import {
  getSceneBeats,
  getStoryboardStatus,
} from '@/lib/script/beatMigration'
import type { SceneBeat, StoryboardStatus } from '@/lib/script/segmentTypes'

interface StoryboardReviewPanelProps {
  scene: Record<string, unknown>
  sceneIndex: number
  onApprove: (sceneIndex: number) => void | Promise<void>
  onRegenerateBeat?: (sceneIndex: number, beatIndex: number) => void | Promise<void>
  isApproving?: boolean
  /** When true, suppress the panel title — parent tab provides the label. */
  hideOuterChrome?: boolean
}

function kindLabel(kind: SceneBeat['kind']): string {
  if (kind === 'action') return 'Action'
  if (kind === 'narration') return 'Narration'
  return 'Dialogue'
}

function kindBadgeClass(kind: SceneBeat['kind']): string {
  if (kind === 'action') return 'bg-amber-500/20 text-amber-300'
  if (kind === 'narration') return 'bg-blue-500/20 text-blue-300'
  return 'bg-emerald-500/20 text-emerald-300'
}

export function StoryboardReviewPanel({
  scene,
  sceneIndex,
  onApprove,
  onRegenerateBeat,
  isApproving = false,
  hideOuterChrome = false,
}: StoryboardReviewPanelProps) {
  const beats = getSceneBeats(scene)
  const status: StoryboardStatus = getStoryboardStatus(scene)
  const allFramesReady = beats.every((b) => !!b.storyboardImageUrl?.trim())
  const canApprove = allFramesReady && status !== 'approved'

  if (beats.length === 0) return null

  const statusBadge = (
    <span
      className={`text-xs px-2 py-1 rounded-full ${
        status === 'approved'
          ? 'bg-emerald-500/20 text-emerald-300'
          : status === 'pending_review'
            ? 'bg-amber-500/20 text-amber-300'
            : 'bg-gray-700 text-gray-300'
      }`}
    >
      {status === 'approved' ? 'Approved' : status === 'pending_review' ? 'Pending review' : 'Not started'}
    </span>
  )

  return (
    <div className={hideOuterChrome ? 'space-y-4' : 'rounded-lg border border-gray-700 bg-gray-900/60 p-4 space-y-4'}>
      {hideOuterChrome ? (
        <div className="flex items-center justify-end">{statusBadge}</div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              Review
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Approve Pre-Vis frames to unlock automated production.
            </p>
          </div>
          {statusBadge}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {beats.map((beat, idx) => (
          <div
            key={`${beat.beatId}-${idx}`}
            className="rounded-lg border border-gray-700 overflow-hidden bg-gray-950/50"
          >
            <div className="aspect-video bg-gray-800 relative">
              {beat.storyboardImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={beat.storyboardImageUrl}
                  alt={`Beat ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                  No frame
                </div>
              )}
              <span
                className={`absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded ${kindBadgeClass(beat.kind)}`}
              >
                {kindLabel(beat.kind)}
              </span>
              {beat.needsSplit && (
                <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-500/30 text-orange-200 flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  Split
                </span>
              )}
            </div>
            <div className="p-2 space-y-1">
              <p className="text-[10px] text-gray-400 line-clamp-2">
                {beat.kind === 'action'
                  ? beat.actionDescription
                  : beat.line?.replace(/\[[^\]]*\]/g, '').trim()}
              </p>
              {beat.storyboardImagePrompt?.trim() && (
                <p className="text-[10px] text-gray-500 line-clamp-2 italic" title={beat.storyboardImagePrompt}>
                  Prompt: {beat.storyboardImagePrompt}
                </p>
              )}
              {onRegenerateBeat && (
                <button
                  type="button"
                  onClick={() => onRegenerateBeat(sceneIndex, idx)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300"
                >
                  Regenerate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!allFramesReady && (
        <div className="flex items-start gap-2 text-xs text-amber-300/90">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Generate all beat frames via Express before approving.</span>
        </div>
      )}

      {status !== 'approved' && (
        <Button
          onClick={() => onApprove(sceneIndex)}
          disabled={!canApprove || isApproving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Check className="w-4 h-4 mr-2" />
          {isApproving ? 'Approving…' : 'Approve Pre-Vis'}
        </Button>
      )}
    </div>
  )
}
