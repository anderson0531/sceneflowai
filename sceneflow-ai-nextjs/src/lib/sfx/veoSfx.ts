/**
 * Veo native-audio SFX generation: low-cost T2V clip → extract MP3 → GCS.
 *
 * Video is discarded after audio extraction; only the audio URL is persisted.
 */

import {
  generateVideoWithVeo,
  waitForVideoCompletion,
} from '@/lib/gemini/videoClient'
import {
  isVeoDiagnosticLogEnabled,
  summarizePromptForPolicyHeuristics,
} from '@/lib/gemini/veoRequestDiagnostics'
import { downloadProductionVideo } from '@/lib/gemini/productionVideoClient'
import { uploadToGCS } from '@/lib/storage/gcsAssets'
import { extractAudioFromVideoBuffer } from '@/lib/sfx/extractAudioFromVideo'
import { extractInlineSfxFromActionText } from '@/lib/script/deriveSfxFromSceneContent'
import {
  resolveVeoSfxClipDuration,
  type VeoSfxClipDuration,
} from '@/lib/sfx/veoSfxDuration'
import { withVeoSfxRetries } from '@/lib/sfx/veoSfxRetry'
import { autoSanitizePrompt } from '@/utils/promptModerator'
import { DEFAULT_VEO_SFX_QUALITY } from '@/lib/config/modelConfig'

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value ?? fallback)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

export function getVeoSfxPollIntervalSeconds(): number {
  return parsePositiveInt(process.env.VEO_SFX_POLL_INTERVAL_SECONDS, 5)
}

export type VeoSfxPromptMode = 'ambient' | 'actionBeat'

/** Veo tier used for SFX T2V (audio extracted from generated clip). */
export const VEO_SFX_QUALITY = DEFAULT_VEO_SFX_QUALITY

export interface BuildVeoSfxPromptResult {
  prompt: string
  negativePrompt: string
}

export interface GenerateVeoSfxParams {
  text: string
  projectId: string
  sfxId?: string
  sfxIndex?: number
  /** Resolved clip length (4 | 6 | 8). */
  clipDurationSeconds?: VeoSfxClipDuration
  /** ambient = black-frame cue; actionBeat = distilled audio cue on black frame. */
  promptMode?: VeoSfxPromptMode
}

export interface GenerateVeoSfxResult {
  url: string
  gcsPath: string
  clipDurationSeconds: VeoSfxClipDuration
  byteLength: number
  promptMode: VeoSfxPromptMode
}

function buildVeoSfxNegativePrompt(): string {
  return [
    'dialogue',
    'speech',
    'talking',
    'singing',
    'music',
    'score',
    'soundtrack',
    'narration',
    'voiceover',
    'lip sync',
    'lips moving',
  ].join(', ')
}

export function buildVeoSfxPrompt(description: string): BuildVeoSfxPromptResult {
  const trimmed = (description || '').trim()
  const prompt = [
    'Solid black frame with no visible scene.',
    `Continuous ambient sound design only: ${trimmed}.`,
    'Realistic environmental and foley audio for the full clip.',
    'No dialogue, no narration, no music, no singing, no speech.',
  ].join(' ')

  return { prompt, negativePrompt: buildVeoSfxNegativePrompt() }
}

const ACTION_BEAT_AUDIO_CUE_MAX = 160

const SHOT_PREFIX =
  /^(?:WIDE|MEDIUM|CLOSE(?:-UP)?|EXTREME(?:\s+WIDE|\s+CLOSE(?:-UP)?)?|OVER(?:-THE-SHOULDER)?|INSERT|DUTCH(?:\s+ANGLE)?|POV)\s+SHOT:\s*/i

const EMOTIONAL_CLAUSE =
  /\b(feels?|feeling|overwhelming|isolating|staring blankly|eyes wide|internal|emotionally|sense of dread)\b/i

const PHYSICAL_CLAUSE =
  /\b(mug|cup|glass|door|desk|chair|floor|roll|spill|knock|tap|click|crash|thud|scrap|scrape|footstep|keyboard|phone|wind|rain|hum|buzz|sizzle|slam|push|pull|drop|fall|tip|break|shatter|liquid|hardwood|tile|metal|wood)\b/i

const AUDIO_CUE_NORMALIZATIONS: Array<[RegExp, string]> = [
  [/\bspilling a dark stain\b/gi, 'liquid spilling on floor'],
  [/\bdark stain\b/gi, 'liquid spreading on floor'],
  [/\bcoffee stain\b/gi, 'coffee spreading on floor'],
]

function stripShotPrefix(text: string): string {
  return text.replace(SHOT_PREFIX, '').trim()
}

function normalizeAudioCuePhrasing(text: string): string {
  let out = text
  for (const [pattern, replacement] of AUDIO_CUE_NORMALIZATIONS) {
    out = out.replace(pattern, replacement)
  }
  return out.replace(/\s+/g, ' ').trim()
}

function splitIntoClauses(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|;\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function isPhysicalClause(clause: string): boolean {
  if (EMOTIONAL_CLAUSE.test(clause)) return false
  return PHYSICAL_CLAUSE.test(clause)
}

function truncateAudioCue(text: string): string {
  if (text.length <= ACTION_BEAT_AUDIO_CUE_MAX) return text
  return `${text.slice(0, ACTION_BEAT_AUDIO_CUE_MAX - 1)}…`
}

/** Derive a short sound-focused cue from a cinematic action beat description. */
export function distillActionBeatAudioCue(actionDescription: string): string {
  const trimmed = (actionDescription || '').trim()
  if (!trimmed) return ''

  const inlineSfx = extractInlineSfxFromActionText(trimmed)
  if (inlineSfx.length > 0) {
    return truncateAudioCue(normalizeAudioCuePhrasing(inlineSfx.join(', ')))
  }

  const withoutShot = stripShotPrefix(trimmed)
  const clauses = splitIntoClauses(withoutShot)
  const physical = clauses.filter(isPhysicalClause)

  const cue = normalizeAudioCuePhrasing(
    physical.length > 0 ? physical.join('. ') : clauses[0] || withoutShot
  )

  return truncateAudioCue(cue)
}

export function buildVeoActionBeatSfxPrompt(actionDescription: string): BuildVeoSfxPromptResult {
  const audioCue = distillActionBeatAudioCue(actionDescription)
  const { sanitizedPrompt } = autoSanitizePrompt(audioCue, { minSeverity: 'low' })
  return buildVeoSfxPrompt(sanitizedPrompt || audioCue)
}

export function buildVeoSfxPromptForMode(
  text: string,
  mode: VeoSfxPromptMode = 'ambient'
): BuildVeoSfxPromptResult {
  return mode === 'actionBeat' ? buildVeoActionBeatSfxPrompt(text) : buildVeoSfxPrompt(text)
}

async function downloadVeoVideoBuffer(videoUrl: string): Promise<Buffer> {
  if (videoUrl.startsWith('data:video')) {
    const b64 = videoUrl.split(',')[1]
    if (!b64) throw new Error('Invalid inline video data URL')
    return Buffer.from(b64, 'base64')
  }

  if (videoUrl.startsWith('file:')) {
    const buffer = await downloadProductionVideo(videoUrl.slice(5), 'vertex')
    if (!buffer) throw new Error('Failed to download Veo video file')
    return buffer
  }

  const buffer = await downloadProductionVideo(videoUrl, 'vertex')
  if (!buffer) throw new Error('Failed to download Veo video')
  return buffer
}

async function runVeoSfxGenerationAttempt(
  prompt: string,
  negativePrompt: string,
  clipDurationSeconds: VeoSfxClipDuration
): Promise<string> {
  const queued = await generateVideoWithVeo(prompt, {
    quality: VEO_SFX_QUALITY,
    resolution: '720p',
    durationSeconds: clipDurationSeconds,
    aspectRatio: '16:9',
    negativePrompt,
  })

  if (!queued.operationName) {
    throw new Error(queued.error || 'Veo SFX generation failed to start')
  }

  const completed = await waitForVideoCompletion(
    queued.operationName,
    240,
    getVeoSfxPollIntervalSeconds()
  )
  if (completed.status !== 'COMPLETED' || !completed.videoUrl) {
    throw new Error(completed.error || 'Veo SFX generation failed')
  }

  return completed.videoUrl
}

/**
 * Generates a low-cost Veo T2V clip, extracts audio, uploads MP3 to GCS.
 * Caller handles credit checking and charging.
 */
export async function generateVeoSfxAudio(
  params: GenerateVeoSfxParams
): Promise<GenerateVeoSfxResult> {
  const trimmedText = (params.text || '').trim()
  if (!trimmedText) {
    throw new Error('SFX prompt text is required')
  }
  if (!params.projectId) {
    throw new Error('projectId is required')
  }

  const promptMode: VeoSfxPromptMode = params.promptMode ?? 'ambient'
  const clipDurationSeconds: VeoSfxClipDuration =
    params.clipDurationSeconds ?? resolveVeoSfxClipDuration(8)

  const { prompt, negativePrompt } = buildVeoSfxPromptForMode(trimmedText, promptMode)
  const audioCue =
    promptMode === 'actionBeat' ? distillActionBeatAudioCue(trimmedText) : undefined

  console.log('[Veo SFX] Starting T2V generation', {
    promptMode,
    veoQuality: VEO_SFX_QUALITY,
    clipDurationSeconds,
    sourceTextPreview: trimmedText.slice(0, 80),
    ...(audioCue ? { audioCue } : {}),
    prompt,
    negativePromptLength: negativePrompt.length,
  })

  if (isVeoDiagnosticLogEnabled()) {
    console.log('[Veo SFX] policy heuristics (prompt):', summarizePromptForPolicyHeuristics(prompt))
  }

  const videoUrl = await withVeoSfxRetries(
    () => runVeoSfxGenerationAttempt(prompt, negativePrompt, clipDurationSeconds),
    { label: promptMode === 'actionBeat' ? 'Action beat SFX' : 'Ambient SFX' }
  )

  const videoBuffer = await downloadVeoVideoBuffer(videoUrl)
  const audioBuffer = await extractAudioFromVideoBuffer(videoBuffer)

  const id = params.sfxId || (params.sfxIndex !== undefined ? `idx${params.sfxIndex}` : 'cue')
  const filename = `sfx-veo-${id}-${Date.now()}.mp3`

  const upload = await uploadToGCS(audioBuffer, {
    projectId: params.projectId,
    category: 'audio',
    subcategory: 'sfx',
    filename,
    contentType: 'audio/mpeg',
    metadata: {
      provider: 'veo',
      veoQuality: VEO_SFX_QUALITY,
      promptMode,
      clipDurationSeconds: String(clipDurationSeconds),
      promptPreview: trimmedText.slice(0, 200),
    },
  })

  return {
    url: upload.publicUrl || upload.url,
    gcsPath: upload.gcsPath,
    clipDurationSeconds,
    byteLength: audioBuffer.length,
    promptMode,
  }
}
