import { findDialogueAudioForLine } from '@/components/vision/scene-production/audioTrackBuilder'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { coerceDialogueLineText } from '@/lib/script/segmentScript'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  beatHasSfxAudio,
  listSelectableActionBeats,
} from '@/lib/sfx/resolveExpressVeoSfxItems'

export type ExpressAudioItemKind = 'music' | 'narration' | 'dialogue' | 'sfx'
export type ExpressAudioScope = 'missing' | 'all'

export interface ExpressAudioItem {
  id: string
  kind: ExpressAudioItemKind
  label: string
  typeLabel: string
  hasAudio: boolean
  dialogueIndex?: number
  beatId?: string
}

const TYPE_LABELS: Record<ExpressAudioItemKind, string> = {
  music: 'Music (Lyria)',
  narration: 'Narration (TTS)',
  dialogue: 'Dialogue (TTS)',
  sfx: 'Action SFX (Veo)',
}

function truncate(text: string, max = 72): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}

function getNarrationAudioUrl(
  scene: Record<string, unknown>,
  lang: string
): string | undefined {
  const sceneRecord = scene as Record<string, unknown>
  const narrationAudio = sceneRecord.narrationAudio as
    | Record<string, { url?: string }>
    | undefined
  if (narrationAudio?.[lang]?.url) {
    return narrationAudio[lang].url
  }
  if (lang === 'en' && typeof sceneRecord.narrationAudioUrl === 'string') {
    return sceneRecord.narrationAudioUrl
  }
  return undefined
}

function dialogueLineHasAudio(
  scene: Record<string, unknown>,
  lang: string,
  dialogueIndex: number,
  lineId?: string,
  character?: string
): boolean {
  const entry = findDialogueAudioForLine(scene, {
    language: lang,
    lineId,
    dialogueIndex,
    character,
  })
  return !!(entry?.audioUrl || entry?.url)
}

function resolveDialogueIndex(
  beat: SceneBeat,
  dialogueLines: Array<Record<string, unknown>>,
  cursor: number
): number {
  if (beat.lineId?.trim()) {
    const byLineId = dialogueLines.findIndex((entry) => entry?.lineId === beat.lineId)
    if (byLineId >= 0) return byLineId
  }
  return cursor
}

function sceneNarrationRepresentedInBeats(
  scene: Record<string, unknown>,
  narrationText: string
): boolean {
  const normalized = narrationText.trim()
  if (!normalized) return false
  return getSceneBeats(scene).some(
    (beat) =>
      beat.kind === 'narration' &&
      coerceDialogueLineText(beat.line).trim() === normalized
  )
}

function buildSpokenLabel(beat: SceneBeat): string | null {
  const line = coerceDialogueLineText(beat.line)
  if (!line.trim() || !beat.character?.trim()) return null
  return truncate(`${beat.character}: ${line}`)
}

export function buildExpressAudioItems(
  scene: Record<string, unknown>,
  lang: string
): ExpressAudioItem[] {
  const items: ExpressAudioItem[] = []
  const selectableActionBeatIds = new Set(
    listSelectableActionBeats(scene).map((beat) => beat.beatId)
  )
  const dialogueLines: Array<Record<string, unknown>> = Array.isArray(scene.dialogue)
    ? (scene.dialogue as Array<Record<string, unknown>>)
    : []
  const beats = getSceneBeats(scene)
  let spokenBeatCursor = 0

  if (scene.music) {
    const sceneRecord = scene as Record<string, unknown>
    const musicAudio = sceneRecord.musicAudio as { url?: string } | undefined
    const music = sceneRecord.music as { url?: string } | undefined
    items.push({
      id: 'music',
      kind: 'music',
      label: 'Background music',
      typeLabel: TYPE_LABELS.music,
      hasAudio: !!(musicAudio?.url || music?.url),
    })
  }

  const narrationText = String(scene.narration ?? '').trim()
  if (narrationText && !sceneNarrationRepresentedInBeats(scene, narrationText)) {
    items.push({
      id: 'narration',
      kind: 'narration',
      label: truncate(narrationText),
      typeLabel: TYPE_LABELS.narration,
      hasAudio: !!getNarrationAudioUrl(scene, lang),
    })
  }

  for (const beat of beats) {
    if (beat.kind === 'narration' || beat.kind === 'dialogue') {
      const label = buildSpokenLabel(beat)
      if (!label) continue

      const dialogueIndex = resolveDialogueIndex(beat, dialogueLines, spokenBeatCursor)
      spokenBeatCursor = Math.max(spokenBeatCursor + 1, dialogueIndex + 1)
      const dialogueLine = dialogueLines[dialogueIndex]
      const isSceneNarration =
        beat.kind === 'narration' &&
        narrationText &&
        coerceDialogueLineText(beat.line).trim() === narrationText

      if (isSceneNarration) {
        items.push({
          id: 'narration',
          kind: 'narration',
          label,
          typeLabel: TYPE_LABELS.narration,
          hasAudio:
            !!getNarrationAudioUrl(scene, lang) ||
            dialogueLineHasAudio(
              scene,
              lang,
              dialogueIndex,
              beat.lineId,
              beat.character
            ),
        })
        continue
      }

      items.push({
        id: `dialogue-${dialogueIndex}`,
        kind: beat.kind === 'narration' ? 'narration' : 'dialogue',
        label,
        typeLabel:
          beat.kind === 'narration' ? TYPE_LABELS.narration : TYPE_LABELS.dialogue,
        hasAudio: dialogueLineHasAudio(
          scene,
          lang,
          dialogueIndex,
          beat.lineId ?? (dialogueLine?.lineId as string | undefined),
          beat.character ?? (dialogueLine?.character as string | undefined)
        ),
        dialogueIndex,
      })
      continue
    }

    if (beat.kind === 'action' && selectableActionBeatIds.has(beat.beatId)) {
      const description = beat.actionDescription?.trim() ?? ''
      items.push({
        id: `sfx-${beat.beatId}`,
        kind: 'sfx',
        label: truncate(description || 'Action beat'),
        typeLabel: TYPE_LABELS.sfx,
        hasAudio: beatHasSfxAudio(scene, {
          beatId: beat.beatId,
          actionDescription: description,
          kind: 'action',
        }),
        beatId: beat.beatId,
      })
    }
  }

  return items
}

export function defaultExpressAudioSelection(
  items: ExpressAudioItem[],
  scope: ExpressAudioScope
): string[] {
  if (scope === 'all') return items.map((item) => item.id)
  return items.filter((item) => !item.hasAudio).map((item) => item.id)
}

export function parseExpressAudioSelectedIds(selectedIds: string[]): {
  includeNarration: boolean
  dialogueIndices: number[]
  includeMusic: boolean
  sfxBeatIds: string[]
} {
  const dialogueIndices: number[] = []
  const sfxBeatIds: string[] = []
  let includeNarration = false
  let includeMusic = false

  for (const id of selectedIds) {
    if (id === 'narration') {
      includeNarration = true
      continue
    }
    if (id === 'music') {
      includeMusic = true
      continue
    }
    if (id.startsWith('dialogue-')) {
      const index = Number.parseInt(id.slice('dialogue-'.length), 10)
      if (Number.isFinite(index)) dialogueIndices.push(index)
      continue
    }
    if (id.startsWith('sfx-')) {
      sfxBeatIds.push(id.slice('sfx-'.length))
    }
  }

  return {
    includeNarration,
    dialogueIndices,
    includeMusic,
    sfxBeatIds,
  }
}
