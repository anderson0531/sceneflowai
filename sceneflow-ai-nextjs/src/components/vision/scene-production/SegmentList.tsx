'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Clapperboard } from 'lucide-react'
import type { ScriptSegment, DialogueLine } from '@/lib/script/segmentTypes'
import { SegmentDialogueCard } from './SegmentDialogueCard'
import { SegmentSfxCard } from './SegmentSfxCard'

/**
 * Renders the segmented Production Script for one scene: each segment is a
 * card containing segment direction, ordered dialog/narrator lines, and
 * SFX cues. Replaces the flat `scene.dialogue.map()` block in the legacy
 * Script tab.
 *
 * Narrator and character dialogue share a single visual list (with the
 * narrator badged + italic). Audio handlers are reused from the existing
 * scene-level callbacks via `dialogueIndex` for back-compat.
 */
export interface SegmentListProps {
  scene: any
  sceneIdx: number
  segments: ScriptSegment[]
  selectedLanguage: string
  playingAudio: string | null
  projectId?: string
  onPlayAudio?: (audioUrl: string, label: string) => void
  onGenerateSceneAudio?: (
    sceneIdx: number,
    audioType: 'narration' | 'dialogue' | 'description',
    character?: string,
    dialogueIndex?: number,
    language?: string
  ) => Promise<void> | void
  onDeleteSceneAudio?: (
    sceneIndex: number,
    audioType: 'description' | 'narration' | 'dialogue' | 'music' | 'sfx',
    dialogueIndex?: number,
    sfxIndex?: number
  ) => void
  uploadAudio?: (
    sceneIdx: number,
    type: 'description' | 'narration' | 'dialogue' | 'sfx' | 'music',
    sfxIdx?: number,
    dialogueIdx?: number,
    characterName?: string
  ) => void | Promise<void>
  /** Persists a generated SFX URL through the project PATCH path. */
  onSaveSfxAudio?: (
    sceneIdx: number,
    audioType: 'sfx' | 'music',
    audioUrl: string,
    sfxIdx?: number,
    sfxAttribution?: Record<string, unknown> | null
  ) => Promise<void> | void
  generatingDialogue?: { sceneIdx: number; character?: string; dialogueIndex?: number; lineId?: string } | null
  setGeneratingDialogue?: (val: any) => void
  overlayStore?: { show: (msg: string, n?: number) => void; hide: () => void }
}

export function SegmentList(props: SegmentListProps) {
  const { scene, segments } = props

  // Build a map { lineId -> dialogueIndex } using the legacy `scene.dialogue`
  // array (positional). Narrator lines are not in `scene.dialogue` so they
  // resolve to null and use the narration audio path.
  const lineIdToDialogueIndex = useMemo(() => {
    const map = new Map<string, number>()
    const flat: any[] = Array.isArray(scene?.dialogue) ? scene.dialogue : []
    if (flat.length === 0) return map

    // First pass: try to match each segment dialogue line to a flat scene.dialogue entry.
    // Strategy: walk segments in order, and for each non-narrator line, pop the next flat
    // entry that matches the same character (or by exact text if character is empty).
    const consumed = new Array<boolean>(flat.length).fill(false)

    for (const seg of segments) {
      for (const line of seg.dialogue) {
        if (line.kind === 'narration') continue
        // Try by lineId match (in case migration stamped it on flat entries).
        let matched = -1
        for (let i = 0; i < flat.length; i++) {
          if (consumed[i]) continue
          const f = flat[i]
          if (typeof f?.lineId === 'string' && f.lineId === line.lineId) {
            matched = i
            break
          }
        }
        // Fall back: same character, first sentence prefix match.
        if (matched < 0) {
          for (let i = 0; i < flat.length; i++) {
            if (consumed[i]) continue
            const f = flat[i]
            if ((f?.character || '').toLowerCase() === (line.character || '').toLowerCase()) {
              matched = i
              break
            }
          }
        }
        if (matched >= 0) {
          consumed[matched] = true
          map.set(line.lineId, matched)
        }
      }
    }
    return map
  }, [scene, segments])

  return (
    <div className="space-y-3">
      {segments.map((segment, segIdx) => (
        <SegmentCard
          key={segment.segmentId}
          {...props}
          segment={segment}
          segmentIndex={segIdx}
          resolveDialogueIndex={(line) => lineIdToDialogueIndex.get(line.lineId) ?? null}
        />
      ))}
    </div>
  )
}

interface SegmentCardProps extends SegmentListProps {
  segment: ScriptSegment
  segmentIndex: number
  resolveDialogueIndex: (line: DialogueLine) => number | null
}

function SegmentCard({
  segment,
  segmentIndex,
  resolveDialogueIndex,
  ...rest
}: SegmentCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const duration = Math.max(0, segment.endTime - segment.startTime)
  const isContinuation =
    segment.segmentId.includes('_c') ||
    /continuation/i.test(segment.segmentDirection || '')

  return (
    <div className="rounded-lg border border-blue-700/40 bg-blue-950/20">
      <div className="flex items-center justify-between gap-3 p-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setCollapsed((v) => !v)
          }}
          className="flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <ChevronDown
            className={`w-4 h-4 text-blue-300 transition-transform ${collapsed ? '-rotate-90' : ''}`}
          />
          <Clapperboard className="w-4 h-4 text-blue-300" />
          <span className="text-sm font-semibold text-blue-100">
            Segment {segmentIndex + 1}
          </span>
          {isContinuation && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/40 uppercase tracking-wide">
              Continuation
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-500/40 uppercase tracking-wide">
            {duration.toFixed(0)}s
          </span>
          {segment.transitionType && segment.transitionType !== 'CUT' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 uppercase tracking-wide">
              {segment.transitionType}
            </span>
          )}
          <span className="text-[10px] text-blue-200/80">
            {segment.dialogue.length} line{segment.dialogue.length === 1 ? '' : 's'}
            {segment.sfx.length > 0 ? ` · ${segment.sfx.length} SFX` : ''}
          </span>
        </button>
      </div>
      {!collapsed && (
        <div className="px-3 pb-3 space-y-3">
          {segment.dialogue.length === 1 && (
            <div className="rounded-md bg-blue-950/40 border border-blue-700/40 p-2.5 text-xs text-blue-100/90">
              <span className="font-semibold">{segment.dialogue[0].character}:</span>{' '}
              {segment.dialogue[0].line}
            </div>
          )}
          {(segment.startFramePrompt ||
            segment.endFramePrompt ||
            segment.videoPrompt ||
            segment.references?.startFrameDescription ||
            segment.references?.endFrameDescription) && (
            <div className="rounded-md bg-indigo-900/20 border border-indigo-700/40 p-3 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-200">
                Segment Prompts
              </div>
              <div className="space-y-1.5 text-xs text-indigo-100/90">
                {(segment.startFramePrompt || segment.references?.startFrameDescription) && (
                  <p>
                    <span className="font-semibold text-indigo-200">Start frame:</span>{' '}
                    {segment.startFramePrompt || segment.references?.startFrameDescription}
                  </p>
                )}
                {(segment.endFramePrompt || segment.references?.endFrameDescription) && (
                  <p>
                    <span className="font-semibold text-indigo-200">End frame:</span>{' '}
                    {segment.endFramePrompt || segment.references?.endFrameDescription}
                  </p>
                )}
                {segment.videoPrompt && (
                  <p>
                    <span className="font-semibold text-indigo-200">F2V:</span> {segment.videoPrompt}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Dialog + narrator lines */}
          {segment.dialogue.length > 0 && (
            <div className="space-y-2">
              {segment.dialogue.map((line) => (
                <SegmentDialogueCard
                  key={line.lineId}
                  scene={rest.scene}
                  sceneIdx={rest.sceneIdx}
                  line={line}
                  dialogueIndex={resolveDialogueIndex(line)}
                  selectedLanguage={rest.selectedLanguage}
                  playingAudio={rest.playingAudio}
                  onPlayAudio={rest.onPlayAudio}
                  onGenerateSceneAudio={rest.onGenerateSceneAudio}
                  onDeleteSceneAudio={rest.onDeleteSceneAudio}
                  uploadAudio={rest.uploadAudio}
                  generatingDialogue={rest.generatingDialogue}
                  setGeneratingDialogue={rest.setGeneratingDialogue}
                  overlayStore={rest.overlayStore}
                />
              ))}
            </div>
          )}

          {/* SFX */}
          {segment.sfx.length > 0 && (
            <div className="space-y-2">
              {segment.sfx.map((sfx, idx) => (
                <SegmentSfxCard
                  key={sfx.sfxId}
                  scene={rest.scene}
                  sceneIdx={rest.sceneIdx}
                  sfx={sfx}
                  positionInSegment={idx}
                  playingAudio={rest.playingAudio}
                  projectId={rest.projectId}
                  onPlayAudio={rest.onPlayAudio}
                  onDeleteSceneAudio={rest.onDeleteSceneAudio}
                  onSaveSfxAudio={rest.onSaveSfxAudio}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
