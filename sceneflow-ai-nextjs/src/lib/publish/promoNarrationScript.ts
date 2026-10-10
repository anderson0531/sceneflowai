/**
 * Promo voice-over script.
 *
 * The spoken line is plain text. A JSON blob from the model is unwrapped
 * before it is stored or sent to speech.
 */

import { promoShotIncluded } from '@/lib/publish/promoTimeline'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'

export interface PromoNarrationShotLine {
  label: string
  durationSec: number
}

const NARRATION_TEXT_KEYS = ['narration', 'text', 'voiceover', 'voiceOver', 'line'] as const

export function buildPromoNarrationPrompt(opts: {
  title: string
  logline?: string
  genre?: string
  shots: PromoNarrationShotLine[]
  targetDurationSec: number
  languageName: string
  audienceText?: string
  minWords: number
  maxWords: number
}): string {
  const cut = opts.shots
    .map((shot, index) => `${index + 1}. (${shot.durationSec}s) ${shot.label}`)
    .join('\n')

  return `Write one speakable film-trailer voice-over for this ${opts.targetDurationSec}-second promo (${opts.minWords}–${opts.maxWords} words).
The voice-over is mixed from the start of the promo over the picture. Write lines that can be spoken across the full duration.

Title: ${opts.title}
${opts.logline?.trim() ? `Logline: ${opts.logline.trim()}` : ''}
${opts.genre?.trim() ? `Genre: ${opts.genre.trim()}` : ''}
${opts.audienceText?.trim() ? `Target audience:\n${opts.audienceText.trim()}` : ''}
Cut, in order:
${cut || '(no shots yet)'}

Rules:
- Write the narration in ${opts.languageName}
- Present tense, cinematic, urgent but not spoiler-heavy
- Shape the appeal for the target audience
- No stage directions, no character names unless essential
- Return only the spoken narration. No JSON, no labels, no quotation marks.`
}

/** Shots that play, in cut order, for the voice-over prompt. */
export function promoNarrationShotsFromPlan(plan: unknown): PromoNarrationShotLine[] {
  if (!Array.isArray(plan)) return []
  const shots: PromoNarrationShotLine[] = []
  for (const raw of plan) {
    if (!raw || typeof raw !== 'object') continue
    const beat = raw as Partial<PromoTrailerBeatPlan>
    if (!promoShotIncluded(beat)) continue
    const label = typeof beat.label === 'string' ? beat.label.trim() : ''
    if (!label) continue
    const duration =
      typeof beat.durationSec === 'number'
        ? beat.durationSec
        : typeof beat.endSec === 'number' && typeof beat.startSec === 'number'
          ? beat.endSec - beat.startSec
          : 5
    shots.push({
      label,
      durationSec: Math.max(1, Math.round(duration) || 1),
    })
  }
  return shots
}

function narrationField(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const record = value as Record<string, unknown>
  for (const key of NARRATION_TEXT_KEYS) {
    const line = record[key]
    if (typeof line === 'string' && line.trim()) return line.trim()
  }
  return ''
}

function salvageNarrationString(text: string): string {
  for (const key of NARRATION_TEXT_KEYS) {
    const match = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)`))
    const value = match?.[1]?.replace(/\\"/g, '"').replace(/\\n/g, ' ').trim()
    if (value) return value
  }
  return ''
}

/** Spoken line from plain text, or from a JSON object the model returned anyway. */
export function unwrapPromoNarrationText(raw: string | null | undefined): string {
  let text = (raw ?? '').trim()
  text = text.replace(/^```(?:json|text)?\s*/i, '').replace(/\s*```$/i, '').trim()
  if (!text) return ''
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const line = narrationField(JSON.parse(text))
      if (line) return line.replace(/^["']|["']$/g, '').trim()
    } catch {
      const salvaged = salvageNarrationString(text)
      if (salvaged) return salvaged
    }
    return ''
  }
  return text.replace(/^["']|["']$/g, '').trim()
}

function dialogueAudioRecord(scene: unknown): Record<string, unknown[]> | undefined {
  if (!scene || typeof scene !== 'object') return undefined
  const audio = (scene as { dialogueAudio?: unknown }).dialogueAudio
  if (!audio || typeof audio !== 'object' || Array.isArray(audio)) return undefined
  return audio as Record<string, unknown[]>
}

function firstTrackLine(tracks: unknown): string | undefined {
  if (!Array.isArray(tracks) || !tracks[0] || typeof tracks[0] !== 'object') return undefined
  const line = (tracks[0] as { line?: unknown }).line
  return typeof line === 'string' && line.trim() ? line.trim() : undefined
}

export function promoNarrationLineFromScene(scene: unknown, language: string): string | undefined {
  return firstTrackLine(dialogueAudioRecord(scene)?.[language])
}

/**
 * Keep a stored voice-over when the client scene has no line for that language.
 * A timeline edit sends the client's scenes, which can lag the saved track.
 */
export function mergePromoDialogueAudio(
  clientScene: unknown,
  storedScene: unknown
): Record<string, unknown[]> | undefined {
  const client = dialogueAudioRecord(clientScene)
  const stored = dialogueAudioRecord(storedScene)
  if (!client && !stored) return undefined
  const languages = new Set([...Object.keys(client ?? {}), ...Object.keys(stored ?? {})])
  const merged: Record<string, unknown[]> = {}
  for (const language of languages) {
    const clientTracks = client?.[language]
    const storedTracks = stored?.[language]
    if (firstTrackLine(clientTracks) && Array.isArray(clientTracks)) {
      merged[language] = clientTracks
    } else if (Array.isArray(storedTracks) && storedTracks.length > 0) {
      merged[language] = storedTracks
    } else if (Array.isArray(clientTracks) && clientTracks.length > 0) {
      merged[language] = clientTracks
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined
}
