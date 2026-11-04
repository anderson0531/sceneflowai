/**
 * Multimodal Scene Video Reviewer (Server / Intelligence Engine)
 *
 * Uses Vertex AI Gemini multimodal vision + video inspection (`generateWithVision`)
 * to evaluate a scene's rendered MP4 and/or shot video clips + keyframes +
 * canonical references from both an Audience (AR Score) and Director perspective.
 */

import { getAudienceResonanceModel, getGeminiTextModel } from '@/lib/config/modelConfig'
import type { StillDirectorPatch } from '@/lib/intelligence/beat-still-director-fallback'
import {
  ANOMALY_CATEGORY_LABELS,
  normalizeRecommendationShotPatch,
  type AnomalyCategory,
  type AnomalyOrigin,
  type AnomalySeverity,
  type AudiencePerspectiveReview,
  type DirectorPerspectiveReview,
  type PerspectiveDimension,
  type RecommendationCategory,
  type RecommendationTarget,
  type ResolvedReviewSource,
  type SceneVideoAnomaly,
  type SceneVideoRecommendation,
  type SceneVideoReviewResult,
  type SceneVideoReviewSourceMode,
  type ShotReviewAssessment,
} from '@/lib/intelligence/scene-video-reviewer-types'
import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  downloadGcsAssetFromHttpsUrl,
  isGcsUri,
  parseGcsHttpsUrl,
} from '@/lib/storage/gcsAssets'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { generateWithVision, type VisionPart } from '@/lib/vertexai/gemini'

// ============================================================================
// Constants & Caps
// ============================================================================

const MAX_INLINE_VIDEO_BYTES = 18 * 1024 * 1024 // 18 MB inline cap per video clip
const MAX_INLINE_IMAGE_BYTES = 6 * 1024 * 1024 // 6 MB inline cap per image
const MAX_SHOT_CLIPS_IN_PROMPT = 10
const MAX_KEYFRAMES_IN_PROMPT = 12
const MAX_REFERENCE_PLATES = 6
const MEDIA_FETCH_TIMEOUT_MS = 15_000

const VALID_ANOMALY_CATEGORIES = new Set<AnomalyCategory>([
  'identity_drift',
  'wardrobe_mismatch',
  'prop_inconsistency',
  'axis_180_violation',
  'morphing_artifact',
  'frozen_motion',
  'gibberish_text',
  'lighting_jump',
  'script_deviation',
  'audio_sync_mismatch',
  'framing_clipping',
])

const VALID_SEVERITIES = new Set<AnomalySeverity>(['critical', 'major', 'minor'])
const VALID_ORIGINS = new Set<AnomalyOrigin>(['frame', 'motion', 'both', 'script', 'audio'])
const VALID_TARGETS = new Set<RecommendationTarget>(['shot_director', 'scene_director'])
const VALID_REC_CATEGORIES = new Set<RecommendationCategory>([
  'visual_prompt',
  'camera_blocking',
  'continuity_fix',
  'motion_retake',
  'script_pacing',
  'dialogue_polish',
  'audio_sync',
])

// ============================================================================
// Input Interfaces
// ============================================================================

export interface ReviewerSegmentInput {
  segmentId: string
  beatId?: string | null
  sequenceIndex?: number
  startTime?: number
  endTime?: number
  status?: string
  activeAssetUrl?: string | null
  assetType?: 'video' | 'image' | null
  generatedPrompt?: string
  videoPrompt?: string | null
  userEditedPrompt?: string | null
  negativePrompt?: string
  cameraMovement?: string
  shotType?: string
  cameraAngle?: string
  startFrameUrl?: string | null
  endFrameUrl?: string | null
   references?: {
    startFrameUrl?: string | null
    endFrameUrl?: string | null
  }
  takes?: Array<{
    id: string
    assetUrl: string
    status?: string
  }>
}

export interface ReviewerStreamInput {
  id: string
  language?: string
  streamType?: 'video' | 'animatic'
  status?: string
  mp4Url?: string | null
  duration?: number
  completedAt?: string
}

export interface ReviewerReferenceCatalog {
  characters?: Array<{
    id?: string
    name: string
    description?: string
    appearanceDescription?: string
    referenceImage?: string
    defaultWardrobe?: string
    type?: string
  }>
  locationReferences?: Array<{
    id: string
    name?: string
    location?: string
    description?: string
    imageUrl?: string
    sceneNumbers?: number[]
  }>
  objectReferences?: Array<{
    id: string
    name: string
    description?: string
    imageUrl?: string
    sceneNumbers?: number[]
  }>
}

export interface ReviewSceneVideoInput {
  sceneId: string
  sceneNumber: number
  sceneIndex: number
  scene: Record<string, unknown>
  sourceMode?: SceneVideoReviewSourceMode
  streamId?: string
  segments?: ReviewerSegmentInput[]
  productionStreams?: ReviewerStreamInput[]
  renderedSceneUrl?: string | null
  references?: ReviewerReferenceCatalog
  previousArScore?: number
  language?: string
}

// ============================================================================
// Media Resolution Helpers (GCS URI & Inline Base64)
// ============================================================================

/**
 * Convert a GCS URI (`gs://...`) or GCS HTTPS URL (`https://storage.googleapis.com/...`)
 * into a canonical `gs://bucket/path` URI suitable for Vertex AI `fileData`.
 */
export function toVertexGcsUri(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (isGcsUri(trimmed)) return trimmed
  const parsed = parseGcsHttpsUrl(trimmed)
  if (!parsed) return null
  const decodedPath = (() => {
    try {
      return decodeURIComponent(parsed.filePath)
    } catch {
      return parsed.filePath
    }
  })()
  return `gs://${parsed.bucketName}/${decodedPath}`
}

/**
 * Fetch a media URL (image or video) into base64 `inlineData`.
 * Supports `data:` URLs, GCS HTTPS URLs (via service account fallback), and standard HTTPS URLs.
 */
export async function fetchMediaAsInlinePart(
  url: string,
  defaultMimeType: string,
  maxBytes: number
): Promise<VisionPart | null> {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    if (trimmed.startsWith('data:')) {
      const match = trimmed.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        return {
          inlineData: {
            mimeType: match[1] || defaultMimeType,
            data: match[2],
          },
        }
      }
      return null
    }

    // Try standard HTTPS fetch with timeout first
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), MEDIA_FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(trimmed, { signal: controller.signal })
      if (response.ok) {
        const contentLength = Number(response.headers.get('content-length') || 0)
        if (contentLength > maxBytes) {
          console.warn(
            `[SceneVideoReviewer] Skipping inline media (${contentLength} bytes > ${maxBytes}): ${trimmed.slice(0, 80)}`
          )
          return null
        }
        const arrayBuffer = await response.arrayBuffer()
        if (arrayBuffer.byteLength > maxBytes) {
          console.warn(
            `[SceneVideoReviewer] Media buffer exceeded cap (${arrayBuffer.byteLength} > ${maxBytes})`
          )
          return null
        }
        const rawMime = response.headers.get('content-type')?.split(';')[0]?.trim()
        const mimeType =
          rawMime && rawMime !== 'application/octet-stream' ? rawMime : defaultMimeType
        return {
          inlineData: {
            mimeType,
            data: Buffer.from(arrayBuffer).toString('base64'),
          },
        }
      }
    } finally {
      clearTimeout(timer)
    }

    // Fallback to GCS service account download if private GCS URL
    if (parseGcsHttpsUrl(trimmed)) {
      const downloaded = await downloadGcsAssetFromHttpsUrl(trimmed)
      if (downloaded.buffer.byteLength <= maxBytes) {
        return {
          inlineData: {
            mimeType: downloaded.contentType || defaultMimeType,
            data: downloaded.buffer.toString('base64'),
          },
        }
      }
    }
  } catch (err) {
    console.warn(
      `[SceneVideoReviewer] Failed to fetch media (${trimmed.slice(0, 80)}):`,
      err instanceof Error ? err.message : String(err)
    )
  }

  return null
}

/**
 * Resolve a video URL into a Vertex AI `VisionPart`.
 * When `preferFileUri` is true and the URL points to GCS, returns a `fileData` part (`gs://...`).
 * Otherwise fetches as base64 `inlineData`.
 */
export async function resolveVideoVisionPart(
  url: string,
  options: { preferFileUri?: boolean } = { preferFileUri: true }
): Promise<{ part: VisionPart; usedFileUri: boolean } | null> {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  if (options.preferFileUri !== false) {
    const gcsUri = toVertexGcsUri(trimmed)
    if (gcsUri) {
      return {
        part: {
          fileData: {
            mimeType: 'video/mp4',
            fileUri: gcsUri,
          },
        },
        usedFileUri: true,
      }
    }
  }

  const inline = await fetchMediaAsInlinePart(trimmed, 'video/mp4', MAX_INLINE_VIDEO_BYTES)
  if (inline) {
    return { part: inline, usedFileUri: false }
  }
  return null
}

// ============================================================================
// Shot & Stream Resolution
// ============================================================================

export interface NormalizedShotContext {
  shotNumber: number // 1-based
  beatIndex: number
  beatId: string
  segmentId?: string
  timecodeRange: string
  kind: 'action' | 'spoken'
  speaker?: string
  scriptText: string
  actionDescription?: string
  shotType?: string
  cameraAngle?: string
  cameraMovement?: string
  blocking?: string
  lightingAccent?: string
  castInFrame?: string[]
  keyProps?: string[]
  framePrompt?: string
  videoPrompt?: string
  negativePrompt?: string
  videoClipUrl?: string
  startFrameUrl?: string
  endFrameUrl?: string
}

function formatTimecodeSec(sec: number): string {
  const safe = Math.max(0, Math.round(sec))
  const mins = Math.floor(safe / 60)
  const rem = safe % 60
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
}

/**
 * Pair scene beats and segments into an ordered shot-by-shot ledger.
 */
export function buildShotContextLedger(
  scene: Record<string, unknown>,
  segmentsInput?: ReviewerSegmentInput[]
): NormalizedShotContext[] {
  const allBeats = getSceneBeats(scene)
  const activeBeats = allBeats
    .map((beat, beatIndex) => ({ beat, beatIndex }))
    .filter(({ beat }) => !isBeatExcluded(beat))

  const rawSegments: ReviewerSegmentInput[] = Array.isArray(segmentsInput) && segmentsInput.length > 0
    ? segmentsInput
    : Array.isArray(scene.segments)
      ? (scene.segments as ReviewerSegmentInput[])
      : []

  const ledger: NormalizedShotContext[] = []
  let runningSec = 0

  if (activeBeats.length > 0) {
    activeBeats.forEach(({ beat, beatIndex }, idx) => {
      const shotNumber = idx + 1
      const matchedSegment =
        rawSegments.find((s) => s.beatId && s.beatId === beat.beatId) ??
        rawSegments[idx]

      const dur =
        matchedSegment &&
        typeof matchedSegment.endTime === 'number' &&
        typeof matchedSegment.startTime === 'number' &&
        matchedSegment.endTime > matchedSegment.startTime
          ? matchedSegment.endTime - matchedSegment.startTime
          : typeof beat.estimatedDuration === 'number' && beat.estimatedDuration > 0
            ? beat.estimatedDuration
            : 5

      const startSec =
        typeof matchedSegment?.startTime === 'number' ? matchedSegment.startTime : runningSec
      const endSec =
        typeof matchedSegment?.endTime === 'number' && matchedSegment.endTime > startSec
          ? matchedSegment.endTime
          : startSec + dur
      runningSec = endSec

      const latestTakeUrl =
        matchedSegment?.takes && matchedSegment.takes.length > 0
          ? matchedSegment.takes[matchedSegment.takes.length - 1]?.assetUrl
          : undefined
      const rawClipUrl = matchedSegment?.activeAssetUrl || latestTakeUrl || undefined
      const isVideoAsset =
        !!rawClipUrl &&
        (matchedSegment?.assetType === 'video' ||
          /\.(mp4|webm|mov)(\?|$)/i.test(rawClipUrl) ||
          matchedSegment?.status === 'COMPLETE' ||
          matchedSegment?.status === 'UPLOADED')

      const startFrameUrl =
        matchedSegment?.startFrameUrl ||
        matchedSegment?.references?.startFrameUrl ||
        beat.storyboardImageUrl ||
        undefined
      const endFrameUrl =
        matchedSegment?.endFrameUrl ||
        matchedSegment?.references?.endFrameUrl ||
        beat.endFrameImageUrl ||
        undefined

      const dir = beat.beatDirection
      const scriptText =
        beat.kind === 'spoken'
          ? `${beat.speaker ? `${beat.speaker}: ` : ''}"${beat.line || ''}"${beat.actionDescription ? ` (${beat.actionDescription})` : ''}`
          : beat.actionDescription || beat.text || ''

      ledger.push({
        shotNumber,
        beatIndex,
        beatId: beat.beatId,
        segmentId: matchedSegment?.segmentId,
        timecodeRange: `${formatTimecodeSec(startSec)} - ${formatTimecodeSec(endSec)}`,
        kind: beat.kind,
        speaker: beat.speaker,
        scriptText: scriptText.trim(),
        actionDescription: beat.actionDescription,
        shotType: dir?.shotType || matchedSegment?.shotType,
        cameraAngle: dir?.cameraAngle || matchedSegment?.cameraAngle,
        cameraMovement: dir?.cameraMovement || matchedSegment?.cameraMovement,
        blocking: dir?.blocking,
        lightingAccent: dir?.lightingAccent,
        castInFrame: dir?.castInFrame,
        keyProps: dir?.keyProps,
        framePrompt: dir?.framePrompt || beat.storyboardImagePrompt,
        videoPrompt:
          matchedSegment?.userEditedPrompt ||
          matchedSegment?.videoPrompt ||
          matchedSegment?.generatedPrompt ||
          dir?.videoPrompt,
        negativePrompt: matchedSegment?.negativePrompt,
        videoClipUrl: isVideoAsset ? rawClipUrl : undefined,
        startFrameUrl: startFrameUrl || undefined,
        endFrameUrl: endFrameUrl || undefined,
      })
    })
    return ledger
  }

  // Fallback if scene only has segments and no beats yet
  rawSegments.forEach((seg, idx) => {
    const shotNumber = idx + 1
    const startSec = typeof seg.startTime === 'number' ? seg.startTime : runningSec
    const endSec =
      typeof seg.endTime === 'number' && seg.endTime > startSec ? seg.endTime : startSec + 5
    runningSec = endSec
    const latestTakeUrl =
      seg.takes && seg.takes.length > 0 ? seg.takes[seg.takes.length - 1]?.assetUrl : undefined
    const rawClipUrl = seg.activeAssetUrl || latestTakeUrl || undefined
    const isVideoAsset =
      !!rawClipUrl &&
      (seg.assetType === 'video' ||
        /\.(mp4|webm|mov)(\?|$)/i.test(rawClipUrl) ||
        seg.status === 'COMPLETE' ||
        seg.status === 'UPLOADED')

    ledger.push({
      shotNumber,
      beatIndex: idx,
      beatId: seg.beatId || `beat-${idx + 1}`,
      segmentId: seg.segmentId,
      timecodeRange: `${formatTimecodeSec(startSec)} - ${formatTimecodeSec(endSec)}`,
      kind: 'action',
      scriptText: seg.userEditedPrompt || seg.videoPrompt || seg.generatedPrompt || `Shot ${shotNumber}`,
      shotType: seg.shotType,
      cameraAngle: seg.cameraAngle,
      cameraMovement: seg.cameraMovement,
      videoPrompt: seg.userEditedPrompt || seg.videoPrompt || seg.generatedPrompt,
      negativePrompt: seg.negativePrompt,
      videoClipUrl: isVideoAsset ? rawClipUrl : undefined,
      startFrameUrl: seg.startFrameUrl || seg.references?.startFrameUrl || undefined,
      endFrameUrl: seg.endFrameUrl || seg.references?.endFrameUrl || undefined,
    })
  })

  return ledger
}

/**
 * Select the rendered scene MP4 stream to inspect when available.
 */
export function selectRenderedStreamForReview(
  streams: ReviewerStreamInput[] | undefined,
  renderedSceneUrl: string | null | undefined,
  preferredStreamId?: string
): { url: string; streamId?: string; streamLabel?: string } | null {
  const list = Array.isArray(streams) ? streams : []
  const completeStreams = list.filter((s) => s && s.mp4Url && s.status === 'complete')

  if (preferredStreamId) {
    const exact = list.find((s) => s.id === preferredStreamId && s.mp4Url)
    if (exact?.mp4Url) {
      return {
        url: exact.mp4Url,
        streamId: exact.id,
        streamLabel: `${exact.streamType === 'animatic' ? 'Animatic' : 'Video'} (${(exact.language || 'en').toUpperCase()})`,
      }
    }
  }

  // Prefer AI video streams over animatic streams by default
  const videoStreams = completeStreams.filter((s) => s.streamType === 'video')
  const chosen = videoStreams[videoStreams.length - 1] ?? completeStreams[completeStreams.length - 1]
  if (chosen?.mp4Url) {
    return {
      url: chosen.mp4Url,
      streamId: chosen.id,
      streamLabel: `${chosen.streamType === 'animatic' ? 'Animatic' : 'Video'} (${(chosen.language || 'en').toUpperCase()})`,
    }
  }

  if (renderedSceneUrl && typeof renderedSceneUrl === 'string' && renderedSceneUrl.trim()) {
    return {
      url: renderedSceneUrl.trim(),
      streamLabel: 'Rendered Scene MP4',
    }
  }

  return null
}

// ============================================================================
// Multimodal Prompt Construction
// ============================================================================

const SYSTEM_INSTRUCTION = `You are SceneFlow AI's Chief Multimodal Scene Reviewer — combining the analytical rigor of an Executive Film Director, Script Supervisor, Continuity Editor, and Target Audience Test Panel.

You are inspecting actual generated video clips (MP4), rendered scene streams, start/end keyframes, canonical character/location/prop reference plates, and the screenplay/shot direction ledger.

Your job has THREE core deliverables:
1. DUAL-PERSPECTIVE EVALUATION & SCORING (WITH PROPORTIONAL SHOT WEIGHTING & CRITICAL DIRECTOR CALIBRATION):
   - AUDIENCE PERSPECTIVE & AR SCORE (0-100): Evaluate the scene holistically as a discerning target viewer watching the sequence. Assess Emotional Impact, Narrative Clarity, Pacing & Momentum, Character Connection, and Audio-Visual Cohesion. Viewers experience story and emotion holistically and forgive isolated technical quirks that do not break narrative immersion.
   - DIRECTOR PERSPECTIVE & DIRECTOR SCORE (0-100): Evaluate the scene as a strictly more critical Executive Film Director, Script Supervisor, and Continuity Editor. Assess Script & Beat Compliance, Character Identity & Wardrobe Continuity, Camera & Blocking Execution, Temporal & Motion Stability (checking for morphing, dead/frozen motion, physics glitches, gibberish text), and Lighting & Atmospheric Cohesion.
   - CRITICAL SCORING CALIBRATION RULES:
     * PROPORTIONAL SHOT-WEIGHTED DEDUCTIONS: If a scene has N shots (e.g. 4 shots) and an anomaly occurs in only 1 shot while the other N-1 shots succeed, weight the scene-level penalty proportionally by 1/N. A single minor anomaly in 1 of 4 shots should reduce the scene AR Score by only ~2-4 points (e.g. 88 -> 85), NEVER by 15-25 points.
     * SCORE STABILITY ACROSS ITERATIONS: When a Previous AR Score is provided, anchor your evaluation to that baseline and adjust proportionally based on resolved issues vs. newly introduced anomalies.
     * DIRECTOR IS ALWAYS MORE CRITICAL THAN AUDIENCE: Because the Director scrutinizes technical craft, continuity locks, 180-degree axis, framing precision, and strict beat compliance far more harshly than a general audience, "directorScore" MUST ALWAYS be lower than or equal to "arScore" (typically 2 to 8 points lower than "arScore", and never higher than "arScore").

2. SHOT-BY-SHOT COMPLIANCE & ANOMALY DETECTION:
   - Evaluate every shot in the Shot Ledger against its written script beat, dialogue, cast in frame, key props, and camera direction.
   - Identify concrete anomalies with exact shotNumber, beatId, segmentId, timecode, category, severity ('critical' | 'major' | 'minor'), and origin ('frame' | 'motion' | 'both' | 'script' | 'audio').
   - Distinguish whether a visual problem originates in the static start keyframe ('frame' -> requires Shot Director prompt update + keyframe regeneration) or only during video motion ('motion' -> requires Shot Director camera/motion/negativePrompt refinement + video clip retake), or in the script/pacing itself ('script').

3. OPTIONAL, ROUTABLE RECOMMENDATIONS ('shot_director' vs 'scene_director'):
   - Every recommendation MUST specify its routing target:
     * "target": "shot_director" — Use this for ALL shot-specific visual corrections, camera angle/shot type/movement adjustments, talent blocking, facial expression/gaze, lighting accents, character/prop continuity fixes, or video motion artifact fixes.
       - You MUST populate "shotNumber" (1-based), "beatId", "segmentId" (if present), "directorInstruction" (clear imperative instruction for the Shot Director), and "shotPatch" (structured StillDirectorPatch fields: shotType, cameraAngle, cameraMovement, frozenMoment, actionDescription, blocking, gaze, emotion, propInteraction, lightingAccent, castInFrame, keyProps, transition).
       - When a motion artifact (morphing, extra limbs, jitter, gibberish text) is present, also populate "negativePromptAdditions" with specific comma-separated negative tokens.
       - Set "regenerateKeyframeRecommended": true if the start frame itself has an identity, wardrobe, prop, or framing error.
     * "target": "scene_director" — Use this ONLY for multi-shot structural revisions, dialogue rewrites, narrative pacing adjustments across the scene, or missing story beats that require editing the scene script.
       - Populate "directorInstruction" with a clear, actionable Scene Director instruction and set "revisionDepth" ('light' | 'moderate' | 'deep').

Respond ONLY with valid JSON matching the requested schema.`

function buildSceneTextPrompt(args: {
  sceneNumber: number
  scene: Record<string, unknown>
  shots: NormalizedShotContext[]
  reviewedSource: ResolvedReviewSource
  streamLabel?: string
  references?: ReviewerReferenceCatalog
  previousArScore?: number
}): string {
  const { sceneNumber, scene, shots, reviewedSource, streamLabel, references, previousArScore } = args

  const heading =
    typeof scene.heading === 'string'
      ? scene.heading
      : (scene.heading as { text?: string } | undefined)?.text || `Scene ${sceneNumber}`
  const action = String(scene.action || scene.visualDescription || '').trim()
  const narration = String(scene.narration || '').trim()
  const dialogueList = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const dialogueBlock =
    dialogueList.length > 0
      ? dialogueList
          .map(
            (d: { character?: string; line?: string; text?: string }, i: number) =>
              `  ${i + 1}. ${d.character || 'SPEAKER'}: "${d.line || d.text || ''}"`
          )
          .join('\n')
      : '  (No dialogue lines)'

  const sceneDir = (scene.sceneDirection || scene.detailedDirection || {}) as Record<string, unknown>
  const dirSummary = Object.keys(sceneDir).length > 0 ? JSON.stringify(sceneDir) : '(None specified)'

  const charCatalog = (references?.characters || [])
    .filter((c) => c.type !== 'narrator')
    .map(
      (c) =>
        `- ${c.name}: ${c.appearanceDescription || c.description || 'Canonical character'}${c.defaultWardrobe ? ` | Wardrobe: ${c.defaultWardrobe}` : ''}`
    )
    .join('\n')

  const locCatalog = (references?.locationReferences || [])
    .filter((l) => !l.sceneNumbers || l.sceneNumbers.includes(sceneNumber))
    .map((l) => `- ${l.location || l.name}: ${l.description || 'Canonical location'}`)
    .join('\n')

  const propCatalog = (references?.objectReferences || [])
    .filter((o) => !o.sceneNumbers || o.sceneNumbers.includes(sceneNumber))
    .map((o) => `- ${o.name}: ${o.description || 'Canonical prop'}`)
    .join('\n')

  const shotLedgerText = shots
    .map((s) => {
      return [
        `SHOT #${s.shotNumber} [beatId="${s.beatId}"${s.segmentId ? `, segmentId="${s.segmentId}"` : ''}, timecode="${s.timecodeRange}", kind="${s.kind}"]`,
        `  Script Beat: ${s.scriptText || '(none)'}`,
        `  Camera Direction: shotType="${s.shotType || 'auto'}", angle="${s.cameraAngle || 'auto'}", movement="${s.cameraMovement || 'auto'}"`,
        `  Blocking & Lighting: blocking="${s.blocking || 'n/a'}", lighting="${s.lightingAccent || 'n/a'}"`,
        `  Cast in Frame: ${s.castInFrame?.join(', ') || '(auto)'} | Key Props: ${s.keyProps?.join(', ') || '(none)'}`,
        `  Current Frame Prompt: ${(s.framePrompt || '(none)').slice(0, 320)}`,
        `  Current Video Prompt: ${(s.videoPrompt || '(none)').slice(0, 320)}`,
        `  Media Attached: videoClip=${s.videoClipUrl ? 'YES' : 'NO'}, startKeyframe=${s.startFrameUrl ? 'YES' : 'NO'}, endKeyframe=${s.endFrameUrl ? 'YES' : 'NO'}`,
      ].join('\n')
    })
    .join('\n\n')

  const modeFocusGuidance =
    reviewedSource === 'keyframes_only'
      ? 'MODE FOCUS — STILLS (KEYFRAMES): You are inspecting the static shot keyframe stills and canonical reference plates prior to or independent of video motion. Focus on character identity, wardrobe, prop continuity, framing/composition, lighting, and script beat compliance. Set anomaly origin to "frame" (or "script") and set "regenerateKeyframeRecommended": true on visual shot fixes.'
      : reviewedSource === 'shot_clips'
        ? 'MODE FOCUS — CLIPS (SHOT VIDEO CLIPS): You are inspecting the individual rendered shot video clips (MP4). Focus on temporal motion stability, morphing/anatomy artifacts, camera movement execution, performance, and shot-to-shot continuity.'
        : 'MODE FOCUS — SCENE (RENDERED SCENE MP4): You are inspecting the assembled full-scene MP4 stream. Focus on holistic pacing, cut transitions, audio-visual synchronization, dialogue timing, and end-to-end audience resonance.'

  return `=== MULTIMODAL SCENE VIDEO REVIEW REQUEST ===
Scene Number: ${sceneNumber}
Scene Heading: ${heading}
Review Mode / Source: ${reviewedSource}${streamLabel ? ` (${streamLabel})` : ''}
${modeFocusGuidance}
${typeof previousArScore === 'number' ? `Previous AR Score: ${previousArScore}/100` : ''}

--- SCREENPLAY CONTEXT ---
Action / Visual Description:
${action || '(None)'}

Narration:
${narration || '(None)'}

Dialogue:
${dialogueBlock}

Scene-Level Direction Metadata:
${dirSummary}

--- CANONICAL PRODUCTION BIBLE ---
Characters:
${charCatalog || '(None listed)'}

Locations:
${locCatalog || '(None listed)'}

Props / Set Pieces:
${propCatalog || '(None listed)'}

--- SHOT-BY-SHOT LEDGER (${shots.length} SHOTS) ---
${shotLedgerText}

--- OUTPUT JSON SCHEMA ---
Return ONLY a single valid JSON object with this exact structure:
{
  "arScore": <number 0-100>,
  "directorScore": <number 0-100>,
  "overallScore": <number 0-100>,
  "executiveSummary": "<2-3 sentence synthesis of the scene's visual/video execution and resonance>",
  "audiencePerspective": {
    "arScore": <number 0-100>,
    "summary": "<audience perspective critique>",
    "emotionalArcAssessment": "<how the emotional arc lands visually and aurally>",
    "narrativeClarity": "<whether a viewer clearly understands the story beat and visual progression>",
    "pacingAndMomentum": "<cut rhythm, shot durations, and visual energy>",
    "dimensions": [
      { "id": "emotional_impact", "name": "Emotional Impact", "score": <0-100>, "feedback": "<specific note>" },
      { "id": "narrative_clarity", "name": "Narrative Clarity", "score": <0-100>, "feedback": "<specific note>" },
      { "id": "pacing_momentum", "name": "Pacing & Momentum", "score": <0-100>, "feedback": "<specific note>" },
      { "id": "character_connection", "name": "Character Connection", "score": <0-100>, "feedback": "<specific note>" },
      { "id": "audiovisual_cohesion", "name": "Audio-Visual Cohesion", "score": <0-100>, "feedback": "<specific note>" }
    ]
  },
  "directorPerspective": {
    "directorScore": <number 0-100>,
    "summary": "<director and script supervisor critique>",
    "scriptComplianceScore": <number 0-100>,
    "continuityScore": <number 0-100>,
    "technicalExecutionScore": <number 0-100>,
    "coverageAndBlockingNotes": "<assessment of shot progression, 180-degree axis, eyelines, and camera blocking>",
    "dimensions": [
      { "id": "script_compliance", "name": "Script & Beat Compliance", "score": <0-100>, "feedback": "<specific note>" },
      { "id": "continuity_identity", "name": "Identity & Continuity", "score": <0-100>, "feedback": "<specific note>" },
      { "id": "camera_blocking", "name": "Camera & Blocking Execution", "score": <0-100>, "feedback": "<specific note>" },
      { "id": "motion_stability", "name": "Motion & Temporal Stability", "score": <0-100>, "feedback": "<specific note>" },
      { "id": "lighting_atmosphere", "name": "Lighting & Atmosphere", "score": <0-100>, "feedback": "<specific note>" }
    ]
  },
  "shotBreakdown": [
    {
      "shotNumber": <1-based integer>,
      "beatId": "<exact beatId from Shot Ledger>",
      "segmentId": "<exact segmentId from Shot Ledger if present>",
      "timecodeRange": "<MM:SS - MM:SS>",
      "score": <0-100>,
      "status": "pass" | "warning" | "fail",
      "scriptComplianceScore": <0-100>,
      "scriptComplianceNote": "<how well the shot matches its written beat, cast, props, and dialogue>",
      "visualQualityNote": "<assessment of composition, motion stability, lighting, and realism>",
      "continuityNote": "<identity, wardrobe, prop, and eyeline continuity with adjacent shots>"
    }
  ],
  "anomalies": [
    {
      "id": "anom-1",
      "shotNumber": <1-based integer or null if scene-wide>,
      "beatId": "<exact beatId if shot-specific>",
      "segmentId": "<exact segmentId if shot-specific>",
      "timecode": "<MM:SS - MM:SS>",
      "category": "identity_drift" | "wardrobe_mismatch" | "prop_inconsistency" | "axis_180_violation" | "morphing_artifact" | "frozen_motion" | "gibberish_text" | "lighting_jump" | "script_deviation" | "audio_sync_mismatch" | "framing_clipping",
      "severity": "critical" | "major" | "minor",
      "origin": "frame" | "motion" | "both" | "script" | "audio",
      "title": "<concise anomaly title>",
      "description": "<clear explanation of the anomaly>",
      "evidence": "<what is visibly/aurally happening in the frame or video clip>"
    }
  ],
  "recommendations": [
    {
      "id": "rec-1",
      "title": "<concise recommendation title>",
      "description": "<what this change accomplishes>",
      "rationale": "<why this improves AR score, continuity, or script compliance>",
      "priority": "high" | "medium" | "low",
      "estimatedArImpact": <integer 1-15>,
      "target": "shot_director" | "scene_director",
      "category": "visual_prompt" | "camera_blocking" | "continuity_fix" | "motion_retake" | "script_pacing" | "dialogue_polish" | "audio_sync",
      "shotNumber": <1-based integer when target is shot_director>,
      "beatId": "<exact beatId when target is shot_director>",
      "segmentId": "<exact segmentId when target is shot_director>",
      "timecode": "<MM:SS - MM:SS>",
      "directorInstruction": "<complete, actionable instruction to execute in Shot Director or Scene Director>",
      "shotPatch": {
        "shotType": "<optional updated shot type, e.g. Medium Close-Up>",
        "cameraAngle": "<optional updated angle, e.g. Eye-Level>",
        "cameraMovement": "<optional updated movement, e.g. Slow Push-In>",
        "frozenMoment": "<optional updated keyframe frozen moment description>",
        "actionDescription": "<optional updated beat action description>",
        "blocking": "<optional precise spatial blocking and posture>",
        "gaze": "<optional eyeline/gaze direction>",
        "emotion": "<optional physicalized emotion>",
        "propInteraction": "<optional explicit prop handling>",
        "lightingAccent": "<optional lighting consistency note>",
        "castInFrame": ["<exact character names in frame>"],
        "keyProps": ["<exact prop names in frame>"]
      },
      "negativePromptAdditions": "<comma-separated negative tokens if suppressing morphing/artifacts>",
      "videoMotionGuidance": "<optional motion constraint note for clip regeneration>",
      "regenerateKeyframeRecommended": <boolean>,
      "revisionDepth": "light" | "moderate"
    }
  ]
}`
}

// ============================================================================
// Response Normalization & Validation
// ============================================================================

function clampScore(value: unknown, fallback: number = 75): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(0, Math.min(100, Math.round(num)))
}

/**
 * Deterministically calibrate Scene Video Review scores so that:
 * 1. Localized shot anomalies deduct proportionally to shot share (`1 / totalShots`)
 *    rather than causing 20+ point scene-wide cliff drops (e.g. 1 anomaly in 1 of 4 shots
 *    deducts ~2-4 points from AR Score, not 22 points).
 * 2. Re-evaluations with `previousArScore` are anchored against uncalibrated LLM score swings.
 * 3. The Director Perspective (`directorScore`) is strictly more critical than the Audience
 *    Perspective (`arScore`), weighting technical/continuity/compliance deductions more heavily
 *    and never exceeding `arScore`.
 */
export function calibrateSceneReviewScores(args: {
  rawArScore: number
  rawDirectorScore: number
  rawOverallScore?: unknown
  previousArScore?: number
  totalShots: number
  shotBreakdown: ShotReviewAssessment[]
  anomalies: SceneVideoAnomaly[]
  recommendationsCount: number
}): {
  arScore: number
  directorScore: number
  overallScore: number
  audienceAnomalyPenalty: number
  directorAnomalyPenalty: number
} {
  const {
    rawArScore,
    rawDirectorScore,
    rawOverallScore,
    previousArScore,
    shotBreakdown,
    anomalies,
    recommendationsCount,
  } = args
  const totalShots = Math.max(1, args.totalShots || shotBreakdown.length || 1)

  // 1. Compute proportional scene-level anomaly penalties weighted by shot share (1 / N)
  let audienceAnomalyPenalty = 0
  let directorAnomalyPenalty = 0

  for (const anomaly of anomalies) {
    const isShotLocalized = Boolean(anomaly.shotNumber || anomaly.beatId)
    const shotShare = isShotLocalized
      ? 1 / totalShots
      : Math.min(1, 2 / Math.max(2, totalShots))

    const audSeverityWeight =
      anomaly.severity === 'critical' ? 26 : anomaly.severity === 'major' ? 16 : 8
    const dirSeverityWeight =
      anomaly.severity === 'critical' ? 36 : anomaly.severity === 'major' ? 24 : 14

    audienceAnomalyPenalty += audSeverityWeight * shotShare
    directorAnomalyPenalty += dirSeverityWeight * shotShare
  }

  // 2. Compute shot-weighted average score
  const shotAvg =
    shotBreakdown.length > 0
      ? shotBreakdown.reduce((sum, s) => sum + s.score, 0) / shotBreakdown.length
      : rawArScore

  // 3. Stabilize Audience Resonance (AR) Score against uncalibrated single-shot cliff drops
  let arScore = clampScore(rawArScore, 76)

  // Floor based on shot-weighted average minus proportional penalty
  const shotWeightedFloor = Math.max(
    0,
    Math.round(shotAvg - Math.ceil(audienceAnomalyPenalty * 0.5) - 2)
  )
  if (arScore < shotWeightedFloor) {
    arScore = shotWeightedFloor
  }

  // Floor based on previousArScore when re-evaluating after iterative fixes/anomalies
  if (typeof previousArScore === 'number' && Number.isFinite(previousArScore) && previousArScore > 0) {
    const maxAllowedDropFromPrev =
      anomalies.length === 0
        ? 2
        : Math.max(3, Math.ceil(audienceAnomalyPenalty) + 1)
    const previousFloor = Math.max(0, Math.round(previousArScore - maxAllowedDropFromPrev))
    if (arScore < previousFloor) {
      arScore = previousFloor
    }
  }

  arScore = clampScore(arScore, 76)

  // 4. Calibrate Director Score to always be more critical than Audience Score (directorScore < arScore)
  //    while also preventing uncalibrated cliff drops on localized shot anomalies.
  const extraDirectorPenalty = Math.max(
    0,
    Math.round(directorAnomalyPenalty - audienceAnomalyPenalty)
  )
  const baseCriticalityGap = anomalies.length > 0 || recommendationsCount > 0 ? 3 : 2
  const minDirectorGap = Math.min(
    12,
    Math.max(2, baseCriticalityGap + Math.floor(extraDirectorPenalty * 0.5))
  )
  const maxDirectorGap = Math.max(
    minDirectorGap + 2,
    Math.ceil(directorAnomalyPenalty) + 4
  )

  const maxAllowedDirectorScore = Math.max(0, arScore - minDirectorGap)
  const minAllowedDirectorScore = Math.max(0, arScore - maxDirectorGap)

  let directorScore = clampScore(rawDirectorScore, maxAllowedDirectorScore)
  if (directorScore > maxAllowedDirectorScore) {
    directorScore = maxAllowedDirectorScore
  } else if (directorScore < minAllowedDirectorScore) {
    directorScore = Math.max(
      minAllowedDirectorScore,
      Math.round(arScore - Math.max(minDirectorGap, Math.ceil(directorAnomalyPenalty)))
    )
  }

  directorScore = clampScore(directorScore, Math.max(0, arScore - minDirectorGap))

  // 5. Recompute overallScore consistently when arScore or directorScore was calibrated
  const compositeScore = Math.round(arScore * 0.5 + directorScore * 0.5)
  const scoresWereAdjusted =
    arScore !== clampScore(rawArScore, 76) ||
    directorScore !== clampScore(rawDirectorScore, 74)
  const overallScore = scoresWereAdjusted
    ? compositeScore
    : clampScore(rawOverallScore, compositeScore)

  return {
    arScore,
    directorScore,
    overallScore,
    audienceAnomalyPenalty,
    directorAnomalyPenalty,
  }
}

export function normalizeReviewResult(
  raw: Record<string, unknown>,
  context: {
    sceneId: string
    sceneNumber: number
    sceneHeading?: string
    reviewedSource: ResolvedReviewSource
    reviewedStreamId?: string
    reviewedStreamLabel?: string
    reviewedVideoUrl?: string
    reviewedClipCount: number
    reviewedKeyframeCount: number
    referencePlateCount: number
    shots: NormalizedShotContext[]
    modelId: string
    previousArScore?: number
  }
): SceneVideoReviewResult {
  const rawAud = (raw.audiencePerspective ?? {}) as Record<string, unknown>
  const rawDir = (raw.directorPerspective ?? {}) as Record<string, unknown>

  const rawArScore = clampScore(raw.arScore ?? rawAud.arScore, 76)
  const rawDirectorScore = clampScore(raw.directorScore ?? rawDir.directorScore, 74)

  // 1. Normalize anomalies first so shot breakdown and score calibration can weight them
  const rawAnomalies = Array.isArray(raw.anomalies) ? raw.anomalies : []
  const anomalies: SceneVideoAnomaly[] = rawAnomalies.map((item, idx) => {
    const obj = (item ?? {}) as Record<string, unknown>
    const rawCat = String(obj.category || '').trim() as AnomalyCategory
    const category: AnomalyCategory = VALID_ANOMALY_CATEGORIES.has(rawCat)
      ? rawCat
      : 'script_deviation'
    const rawSev = String(obj.severity || '').trim() as AnomalySeverity
    const severity: AnomalySeverity = VALID_SEVERITIES.has(rawSev) ? rawSev : 'minor'
    const rawOrigin = String(obj.origin || '').trim() as AnomalyOrigin
    const origin: AnomalyOrigin = VALID_ORIGINS.has(rawOrigin) ? rawOrigin : 'both'

    const shotNum = Number(obj.shotNumber)
    const matchedShot =
      (typeof obj.beatId === 'string'
        ? context.shots.find((s) => s.beatId === obj.beatId)
        : undefined) ??
      (Number.isInteger(shotNum) && shotNum >= 1 ? context.shots[shotNum - 1] : undefined)

    return {
      id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : `anom-${idx + 1}`,
      shotNumber: matchedShot?.shotNumber ?? (Number.isInteger(shotNum) && shotNum >= 1 ? shotNum : undefined),
      beatId: matchedShot?.beatId ?? (typeof obj.beatId === 'string' ? obj.beatId : undefined),
      segmentId:
        matchedShot?.segmentId ?? (typeof obj.segmentId === 'string' ? obj.segmentId : undefined),
      timecode:
        typeof obj.timecode === 'string' && obj.timecode.trim()
          ? obj.timecode.trim()
          : matchedShot?.timecodeRange,
      category,
      severity,
      origin,
      title:
        typeof obj.title === 'string' && obj.title.trim()
          ? obj.title.trim()
          : ANOMALY_CATEGORY_LABELS[category],
      description:
        typeof obj.description === 'string' && obj.description.trim()
          ? obj.description.trim()
          : 'Detected visual or continuity discrepancy.',
      evidence:
        typeof obj.evidence === 'string' && obj.evidence.trim()
          ? obj.evidence.trim()
          : 'Observed during multimodal scene inspection.',
    }
  })

  // 2. Normalize shot breakdown with severity-proportional shot floors
  const cleanShotBaseline = Math.max(
    85,
    typeof context.previousArScore === 'number' ? context.previousArScore : 0,
    rawArScore
  )
  const rawBreakdown = Array.isArray(raw.shotBreakdown) ? raw.shotBreakdown : []
  const shotBreakdown: ShotReviewAssessment[] = context.shots.map((shot) => {
    const rawMatch = (rawBreakdown.find((entry: any) => {
      if (!entry || typeof entry !== 'object') return false
      if (entry.beatId && entry.beatId === shot.beatId) return true
      if (entry.segmentId && shot.segmentId && entry.segmentId === shot.segmentId) return true
      return Number(entry.shotNumber) === shot.shotNumber
    }) ?? {}) as Record<string, unknown>

    const shotAnomalies = anomalies.filter(
      (a) => a.beatId === shot.beatId || a.shotNumber === shot.shotNumber
    )
    const hasCritical = shotAnomalies.some((a) => a.severity === 'critical')
    const hasMajor = shotAnomalies.some((a) => a.severity === 'major')
    const hasMinor = !hasCritical && !hasMajor && shotAnomalies.length > 0

    const defaultScore = hasCritical
      ? 55
      : hasMajor
        ? 70
        : hasMinor
          ? Math.max(78, cleanShotBaseline - 6 * shotAnomalies.length)
          : Math.max(82, cleanShotBaseline)

    const rawStatus = String(rawMatch.status || '').toLowerCase()
    let score = clampScore(rawMatch.score, defaultScore)

    // Prevent clean shots or minor-anomaly shots from being disproportionately tanked
    if (shotAnomalies.length === 0 && rawStatus !== 'fail' && rawStatus !== 'warning') {
      score = Math.max(score, Math.min(82, cleanShotBaseline))
    } else if (hasMinor && rawStatus !== 'fail') {
      const minorShotFloor = Math.max(74, cleanShotBaseline - 10 * shotAnomalies.length)
      score = Math.max(score, minorShotFloor)
    }

    const status: 'pass' | 'warning' | 'fail' =
      rawStatus === 'fail' || hasCritical || score < 60
        ? 'fail'
        : rawStatus === 'warning' || hasMajor || score < 70 || shotAnomalies.length > 0
          ? 'warning'
          : 'pass'

    return {
      shotNumber: shot.shotNumber,
      beatId: shot.beatId,
      segmentId: shot.segmentId,
      timecodeRange:
        typeof rawMatch.timecodeRange === 'string' && rawMatch.timecodeRange.trim()
          ? rawMatch.timecodeRange.trim()
          : shot.timecodeRange,
      score,
      status,
      scriptComplianceScore: clampScore(rawMatch.scriptComplianceScore, score),
      scriptComplianceNote:
        typeof rawMatch.scriptComplianceNote === 'string' && rawMatch.scriptComplianceNote.trim()
          ? rawMatch.scriptComplianceNote.trim()
          : 'Matches scripted beat action and framing.',
      visualQualityNote:
        typeof rawMatch.visualQualityNote === 'string' && rawMatch.visualQualityNote.trim()
          ? rawMatch.visualQualityNote.trim()
          : shot.videoClipUrl
            ? 'Video clip inspected.'
            : shot.startFrameUrl
              ? 'Keyframe still inspected (video clip not yet rendered).'
              : 'Evaluated from shot direction and prompt.',
      continuityNote:
        typeof rawMatch.continuityNote === 'string' && rawMatch.continuityNote.trim()
          ? rawMatch.continuityNote.trim()
          : 'Consistent with scene references.',
      hasVideoClip: !!shot.videoClipUrl,
      hasKeyframe: !!shot.startFrameUrl,
      anomalyIds: shotAnomalies.map((a) => a.id),
    }
  })

  // 3. Normalize recommendations
  const rawRecs = Array.isArray(raw.recommendations) ? raw.recommendations : []
  const recommendations: SceneVideoRecommendation[] = rawRecs
    .map((item, idx): SceneVideoRecommendation | null => {
      const obj = (item ?? {}) as Record<string, unknown>
      const title = typeof obj.title === 'string' ? obj.title.trim() : ''
      const description = typeof obj.description === 'string' ? obj.description.trim() : ''
      const directorInstruction =
        typeof obj.directorInstruction === 'string' && obj.directorInstruction.trim()
          ? obj.directorInstruction.trim()
          : description || title
      if (!directorInstruction) return null

      const rawCategory = String(obj.category || '').trim() as RecommendationCategory
      const category: RecommendationCategory = VALID_REC_CATEGORIES.has(rawCategory)
        ? rawCategory
        : 'visual_prompt'

      const shotNum = Number(obj.shotNumber)
      const matchedShot =
        (typeof obj.beatId === 'string'
          ? context.shots.find((s) => s.beatId === obj.beatId)
          : undefined) ??
        (typeof obj.segmentId === 'string'
          ? context.shots.find((s) => s.segmentId === obj.segmentId)
          : undefined) ??
        (Number.isInteger(shotNum) && shotNum >= 1 ? context.shots[shotNum - 1] : undefined)

      const rawTarget = String(obj.target || '').trim() as RecommendationTarget
      // Default visual/camera/continuity/motion categories or shot-bound items to 'shot_director'
      const isSceneLevelCategory =
        category === 'script_pacing' || category === 'dialogue_polish'
      const target: RecommendationTarget = VALID_TARGETS.has(rawTarget)
        ? rawTarget
        : isSceneLevelCategory && !matchedShot
          ? 'scene_director'
          : 'shot_director'

      // If target is shot_director but no shot was matched, bind to first shot with an anomaly or Shot 1
      const effectiveShot =
        target === 'shot_director'
          ? matchedShot ??
            context.shots.find((s) =>
              anomalies.some((a) => a.beatId === s.beatId || a.shotNumber === s.shotNumber)
            ) ??
            context.shots[0]
          : matchedShot

      const priorityRaw = String(obj.priority || '').toLowerCase()
      const priority: 'high' | 'medium' | 'low' =
        priorityRaw === 'high' || priorityRaw === 'medium' || priorityRaw === 'low'
          ? priorityRaw
          : 'medium'

      const impactNum = Number(obj.estimatedArImpact)
      const estimatedArImpact = Number.isFinite(impactNum)
        ? Math.max(1, Math.min(20, Math.round(impactNum)))
        : priority === 'high'
          ? 6
          : priority === 'medium'
            ? 4
            : 2

      let shotPatch: StillDirectorPatch | undefined = normalizeRecommendationShotPatch(
        obj.shotPatch
      )
      if (target === 'shot_director' && !shotPatch) {
        // Synthesize a baseline shotPatch from directorInstruction so applying it always updates direction
        shotPatch = {
          blocking: directorInstruction,
        }
      }

      const rawDepth = String(obj.revisionDepth || '').toLowerCase()
      const revisionDepth: 'light' | 'moderate' | 'deep' | undefined =
        target === 'scene_director'
          ? rawDepth === 'deep' || rawDepth === 'moderate' || rawDepth === 'light'
            ? rawDepth
            : 'light'
          : undefined

      return {
        id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : `rec-${idx + 1}`,
        title: title || `Director Adjustment ${idx + 1}`,
        description: description || directorInstruction,
        rationale:
          typeof obj.rationale === 'string' && obj.rationale.trim()
            ? obj.rationale.trim()
            : 'Improves visual continuity, script compliance, and audience resonance.',
        priority,
        estimatedArImpact,
        target,
        category,
        shotNumber: effectiveShot?.shotNumber,
        beatId: effectiveShot?.beatId,
        segmentId: effectiveShot?.segmentId,
        timecode:
          typeof obj.timecode === 'string' && obj.timecode.trim()
            ? obj.timecode.trim()
            : effectiveShot?.timecodeRange,
        directorInstruction,
        shotPatch,
        negativePromptAdditions:
          typeof obj.negativePromptAdditions === 'string' && obj.negativePromptAdditions.trim()
            ? obj.negativePromptAdditions.trim()
            : undefined,
        videoMotionGuidance:
          typeof obj.videoMotionGuidance === 'string' && obj.videoMotionGuidance.trim()
            ? obj.videoMotionGuidance.trim()
            : undefined,
        regenerateKeyframeRecommended: Boolean(obj.regenerateKeyframeRecommended),
        revisionDepth,
        applied: false,
      }
    })
    .filter((rec): rec is SceneVideoRecommendation => rec !== null)

  // 4. Calibrate scene-level AR Score, Director Score, and Overall Score
  const { arScore, directorScore, overallScore } = calibrateSceneReviewScores({
    rawArScore,
    rawDirectorScore,
    rawOverallScore: raw.overallScore,
    previousArScore: context.previousArScore,
    totalShots: context.shots.length,
    shotBreakdown,
    anomalies,
    recommendationsCount: recommendations.length,
  })

  const arLiftDelta = Math.max(0, arScore - rawArScore)
  const dirCapDelta = Math.max(0, rawDirectorScore - directorScore)

  const normalizeDimensions = (
    rawList: unknown,
    defaults: Array<{ id: string; name: string; score: number; feedback: string }>,
    options?: { liftBy?: number; capDelta?: number; maxScore?: number }
  ): PerspectiveDimension[] => {
    if (!Array.isArray(rawList) || rawList.length === 0) return defaults
    return rawList.slice(0, 6).map((item, idx) => {
      const obj = (item ?? {}) as Record<string, unknown>
      const def = defaults[idx] ?? {
        id: `dim-${idx + 1}`,
        name: `Dimension ${idx + 1}`,
        score: arScore,
        feedback: '',
      }
      let dimScore = clampScore(obj.score, def.score)
      if (options?.liftBy && options.liftBy > 0) {
        dimScore = clampScore(dimScore + Math.round(options.liftBy * 0.8), def.score)
      }
      if (options?.capDelta && options.capDelta > 0) {
        dimScore = clampScore(dimScore - options.capDelta, def.score)
      }
      if (typeof options?.maxScore === 'number') {
        dimScore = Math.min(dimScore, options.maxScore)
      }
      return {
        id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : def.id,
        name: typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : def.name,
        score: dimScore,
        feedback:
          typeof obj.feedback === 'string' && obj.feedback.trim()
            ? obj.feedback.trim()
            : def.feedback,
      }
    })
  }

  const audiencePerspective: AudiencePerspectiveReview = {
    arScore,
    summary:
      typeof rawAud.summary === 'string' && rawAud.summary.trim()
        ? rawAud.summary.trim()
        : 'Scene delivers clear narrative intent with room to sharpen visual pacing and emotional beats.',
    emotionalArcAssessment:
      typeof rawAud.emotionalArcAssessment === 'string' && rawAud.emotionalArcAssessment.trim()
        ? rawAud.emotionalArcAssessment.trim()
        : 'Emotional progression tracks the scripted beats.',
    narrativeClarity:
      typeof rawAud.narrativeClarity === 'string' && rawAud.narrativeClarity.trim()
        ? rawAud.narrativeClarity.trim()
        : 'Story progression is readable across the sequence.',
    pacingAndMomentum:
      typeof rawAud.pacingAndMomentum === 'string' && rawAud.pacingAndMomentum.trim()
        ? rawAud.pacingAndMomentum.trim()
        : 'Shot cadence maintains steady momentum.',
    dimensions: normalizeDimensions(
      rawAud.dimensions,
      [
        { id: 'emotional_impact', name: 'Emotional Impact', score: arScore, feedback: 'Emotional tone aligns with scene intent.' },
        { id: 'narrative_clarity', name: 'Narrative Clarity', score: arScore, feedback: 'Visual storytelling communicates the core beat.' },
        { id: 'pacing_momentum', name: 'Pacing & Momentum', score: arScore, feedback: 'Rhythm across shots supports engagement.' },
        { id: 'character_connection', name: 'Character Connection', score: arScore, feedback: 'Character presence anchors viewer focus.' },
        { id: 'audiovisual_cohesion', name: 'Audio-Visual Cohesion', score: arScore, feedback: 'Visuals and audio cues complement one another.' },
      ],
      { liftBy: arLiftDelta }
    ),
  }

  const adjustDirectorSubScore = (rawSub: unknown): number => {
    const base = clampScore(rawSub, directorScore)
    if (dirCapDelta > 0) {
      return clampScore(Math.min(arScore, base - dirCapDelta), directorScore)
    }
    return base
  }

  const scriptComplianceScore = adjustDirectorSubScore(rawDir.scriptComplianceScore)
  const continuityScore = adjustDirectorSubScore(rawDir.continuityScore)
  const technicalExecutionScore = adjustDirectorSubScore(rawDir.technicalExecutionScore)

  const directorPerspective: DirectorPerspectiveReview = {
    directorScore,
    summary:
      typeof rawDir.summary === 'string' && rawDir.summary.trim()
        ? rawDir.summary.trim()
        : 'Visual execution largely follows the shot ledger, with targeted shot-level refinements recommended below.',
    scriptComplianceScore,
    continuityScore,
    technicalExecutionScore,
    coverageAndBlockingNotes:
      typeof rawDir.coverageAndBlockingNotes === 'string' && rawDir.coverageAndBlockingNotes.trim()
        ? rawDir.coverageAndBlockingNotes.trim()
        : 'Coverage follows standard continuity progression.',
    dimensions: normalizeDimensions(
      rawDir.dimensions,
      [
        { id: 'script_compliance', name: 'Script & Beat Compliance', score: scriptComplianceScore, feedback: 'Adherence to written action and dialogue beats.' },
        { id: 'continuity_identity', name: 'Identity & Continuity', score: continuityScore, feedback: 'Character, wardrobe, and prop consistency across cuts.' },
        { id: 'camera_blocking', name: 'Camera & Blocking Execution', score: directorScore, feedback: 'Framing, camera movement, and spatial blocking.' },
        { id: 'motion_stability', name: 'Motion & Temporal Stability', score: technicalExecutionScore, feedback: 'Temporal coherence and motion realism.' },
        { id: 'lighting_atmosphere', name: 'Lighting & Atmosphere', score: directorScore, feedback: 'Lighting continuity and tonal atmosphere.' },
      ],
      { capDelta: dirCapDelta }
    ),
  }

  return {
    sceneId: context.sceneId,
    sceneNumber: context.sceneNumber,
    sceneHeading: context.sceneHeading,
    reviewedSource: context.reviewedSource,
    reviewedStreamId: context.reviewedStreamId,
    reviewedStreamLabel: context.reviewedStreamLabel,
    reviewedVideoUrl: context.reviewedVideoUrl,
    reviewedClipCount: context.reviewedClipCount,
    totalShotCount: context.shots.length,
    reviewedKeyframeCount: context.reviewedKeyframeCount,
    referencePlateCount: context.referencePlateCount,
    modelId: context.modelId,
    generatedAt: new Date().toISOString(),
    arScore,
    previousArScore: context.previousArScore,
    directorScore,
    overallScore,
    executiveSummary:
      typeof raw.executiveSummary === 'string' && raw.executiveSummary.trim()
        ? raw.executiveSummary.trim()
        : audiencePerspective.summary,
    audiencePerspective,
    directorPerspective,
    shotBreakdown,
    anomalies,
    recommendations,
  }
}

// ============================================================================
// Main Multimodal Review Execution
// ============================================================================

/**
 * Resolve which media modalities to attach for the 3 distinct review modes:
 * - 'stills': Inspects ONLY shot keyframe stills (`includeKeyframes: true`)
 * - 'shot_clips': Inspects ONLY individual shot video clips (`includeShotClips: true`)
 * - 'rendered_mp4': Inspects ONLY the full rendered scene MP4 stream (`includeRenderedMp4: true`)
 * - 'auto': Picks the highest available stage (Scene -> Clips -> Stills) without mixing Stills & Clips
 */
export function resolveMediaInclusionForSourceMode(args: {
  sourceMode: SceneVideoReviewSourceMode
  hasRenderedStream: boolean
  hasShotClips: boolean
  hasKeyframes: boolean
}): {
  effectiveMode: 'stills' | 'shot_clips' | 'rendered_mp4'
  includeRenderedMp4: boolean
  includeShotClips: boolean
  includeKeyframes: boolean
} {
  const { sourceMode, hasRenderedStream, hasShotClips, hasKeyframes } = args

  if (sourceMode === 'stills') {
    return {
      effectiveMode: 'stills',
      includeRenderedMp4: false,
      includeShotClips: false,
      includeKeyframes: true,
    }
  }

  if (sourceMode === 'shot_clips') {
    return {
      effectiveMode: 'shot_clips',
      includeRenderedMp4: false,
      includeShotClips: hasShotClips,
      // Only fall back to keyframes if no shot clips exist at all
      includeKeyframes: !hasShotClips && hasKeyframes,
    }
  }

  if (sourceMode === 'rendered_mp4') {
    return {
      effectiveMode: 'rendered_mp4',
      includeRenderedMp4: hasRenderedStream,
      includeShotClips: !hasRenderedStream && hasShotClips,
      includeKeyframes: !hasRenderedStream && !hasShotClips && hasKeyframes,
    }
  }

  // 'auto' selects the most complete single stage available (Scene -> Clips -> Stills)
  if (hasRenderedStream) {
    return {
      effectiveMode: 'rendered_mp4',
      includeRenderedMp4: true,
      includeShotClips: false,
      includeKeyframes: false,
    }
  }
  if (hasShotClips) {
    return {
      effectiveMode: 'shot_clips',
      includeRenderedMp4: false,
      includeShotClips: true,
      includeKeyframes: false,
    }
  }
  return {
    effectiveMode: 'stills',
    includeRenderedMp4: false,
    includeShotClips: false,
    includeKeyframes: true,
  }
}

export async function reviewSceneVideoMultimodal(
  input: ReviewSceneVideoInput
): Promise<SceneVideoReviewResult> {
  const sourceMode: SceneVideoReviewSourceMode = input.sourceMode || 'auto'
  const shots = buildShotContextLedger(input.scene, input.segments)
  const selectedStream = selectRenderedStreamForReview(
    input.productionStreams,
    input.renderedSceneUrl,
    input.streamId
  )
  const shotsWithClips = shots.filter((s) => !!s.videoClipUrl)
  const shotsWithKeyframes = shots.filter((s) => !!s.startFrameUrl)

  const { includeRenderedMp4, includeShotClips, includeKeyframes } =
    resolveMediaInclusionForSourceMode({
      sourceMode,
      hasRenderedStream: Boolean(selectedStream && selectedStream.url.length > 0),
      hasShotClips: shotsWithClips.length > 0,
      hasKeyframes: shotsWithKeyframes.length > 0,
    })

  const parts: VisionPart[] = []
  let usedAnyGcsFileUri = false
  const gcsVideoRetryList: Array<{ partIndex: number; url: string }> = []

  // 1. Attach Canonical Reference Plates (Character / Location / Prop)
  let referencePlateCount = 0
  const refCandidates: Array<{ label: string; url: string }> = []
  for (const char of input.references?.characters || []) {
    if (char.type !== 'narrator' && char.referenceImage) {
      refCandidates.push({
        label: `[CANONICAL CHARACTER REFERENCE — ${char.name}]`,
        url: char.referenceImage,
      })
    }
  }
  for (const loc of input.references?.locationReferences || []) {
    if (
      loc.imageUrl &&
      (!loc.sceneNumbers || loc.sceneNumbers.includes(input.sceneNumber))
    ) {
      refCandidates.push({
        label: `[CANONICAL LOCATION REFERENCE — ${loc.location || loc.name || 'Location'}]`,
        url: loc.imageUrl,
      })
    }
  }
  for (const obj of input.references?.objectReferences || []) {
    if (
      obj.imageUrl &&
      (!obj.sceneNumbers || obj.sceneNumbers.includes(input.sceneNumber))
    ) {
      refCandidates.push({
        label: `[CANONICAL PROP REFERENCE — ${obj.name}]`,
        url: obj.imageUrl,
      })
    }
  }

  for (const candidate of refCandidates.slice(0, MAX_REFERENCE_PLATES)) {
    const imgPart = await fetchMediaAsInlinePart(
      candidate.url,
      'image/jpeg',
      MAX_INLINE_IMAGE_BYTES
    )
    if (imgPart) {
      parts.push({ text: candidate.label })
      parts.push(imgPart)
      referencePlateCount += 1
    }
  }

  // 2. Attach Rendered Scene MP4 (when Scene mode is selected)
  let attachedRenderedMp4 = false
  if (includeRenderedMp4 && selectedStream) {
    const resolvedVideo = await resolveVideoVisionPart(selectedStream.url, {
      preferFileUri: true,
    })
    if (resolvedVideo) {
      parts.push({
        text: `[RENDERED SCENE MP4 STREAM — ${selectedStream.streamLabel || 'Full Scene Render'}]`,
      })
      const idx = parts.push(resolvedVideo.part) - 1
      attachedRenderedMp4 = true
      if (resolvedVideo.usedFileUri) {
        usedAnyGcsFileUri = true
        gcsVideoRetryList.push({ partIndex: idx, url: selectedStream.url })
      }
    }
  }

  // 3. Attach Shot Video Clips (when Clips mode is selected) or Keyframe Stills (when Stills mode is selected)
  let reviewedClipCount = 0
  let reviewedKeyframeCount = 0

  for (const shot of shots) {
    if (
      includeShotClips &&
      shot.videoClipUrl &&
      reviewedClipCount < MAX_SHOT_CLIPS_IN_PROMPT
    ) {
      const resolvedClip = await resolveVideoVisionPart(shot.videoClipUrl, {
        preferFileUri: true,
      })
      if (resolvedClip) {
        parts.push({
          text: `[SHOT #${shot.shotNumber} VIDEO CLIP (MP4) — beatId="${shot.beatId}"${shot.segmentId ? `, segmentId="${shot.segmentId}"` : ''}, timecode="${shot.timecodeRange}"]`,
        })
        const idx = parts.push(resolvedClip.part) - 1
        reviewedClipCount += 1
        if (resolvedClip.usedFileUri) {
          usedAnyGcsFileUri = true
          gcsVideoRetryList.push({ partIndex: idx, url: shot.videoClipUrl })
        }
      }
    }

    if (
      includeKeyframes &&
      shot.startFrameUrl &&
      reviewedKeyframeCount < MAX_KEYFRAMES_IN_PROMPT
    ) {
      const framePart = await fetchMediaAsInlinePart(
        shot.startFrameUrl,
        'image/jpeg',
        MAX_INLINE_IMAGE_BYTES
      )
      if (framePart) {
        parts.push({
          text: `[SHOT #${shot.shotNumber} START KEYFRAME STILL — beatId="${shot.beatId}"]`,
        })
        parts.push(framePart)
        reviewedKeyframeCount += 1
      }
    }
  }

  const reviewedSource: ResolvedReviewSource =
    attachedRenderedMp4 && reviewedClipCount > 0
      ? 'hybrid'
      : attachedRenderedMp4
        ? 'rendered_mp4'
        : reviewedClipCount > 0
          ? 'shot_clips'
          : 'keyframes_only'

  // 4. Append Full Screenplay, Shot Ledger & Schema Instructions
  const promptText = buildSceneTextPrompt({
    sceneNumber: input.sceneNumber,
    scene: input.scene,
    shots,
    reviewedSource,
    streamLabel: selectedStream?.streamLabel,
    references: input.references,
    previousArScore: input.previousArScore,
  })
  parts.push({ text: promptText })

  const preferredModel = getAudienceResonanceModel() || getGeminiTextModel('flash')
  let visionResponse

  try {
    visionResponse = await generateWithVision(parts, {
      model: preferredModel,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      thinkingLevel: 'low',
      timeoutMs: 120_000,
    })
  } catch (err) {
    // If Vertex AI rejected a gs:// fileUri (e.g. cross-project IAM or bucket ACL),
    // automatically convert gs:// video parts to inline base64 and retry!
    if (usedAnyGcsFileUri && gcsVideoRetryList.length > 0) {
      console.warn(
        '[SceneVideoReviewer] Retrying multimodal review with inline video bytes after fileData error:',
        err instanceof Error ? err.message : String(err)
      )
      const fallbackParts = [...parts]
      for (const item of gcsVideoRetryList) {
        const inlineVideo = await fetchMediaAsInlinePart(
          item.url,
          'video/mp4',
          MAX_INLINE_VIDEO_BYTES
        )
        if (inlineVideo) {
          fallbackParts[item.partIndex] = inlineVideo
        }
      }
      visionResponse = await generateWithVision(fallbackParts, {
        model: preferredModel,
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        thinkingLevel: 'low',
        timeoutMs: 120_000,
      })
    } else {
      throw err
    }
  }

  const parsed = safeParseJsonFromText(visionResponse.text) as Record<string, unknown>
  const heading =
    typeof input.scene.heading === 'string'
      ? input.scene.heading
      : (input.scene.heading as { text?: string } | undefined)?.text

  return normalizeReviewResult(parsed, {
    sceneId: input.sceneId,
    sceneNumber: input.sceneNumber,
    sceneHeading: heading,
    reviewedSource,
    reviewedStreamId: selectedStream?.streamId,
    reviewedStreamLabel: selectedStream?.streamLabel,
    reviewedVideoUrl: selectedStream?.url ?? shotsWithClips[0]?.videoClipUrl,
    reviewedClipCount,
    reviewedKeyframeCount,
    referencePlateCount,
    shots,
    modelId: visionResponse.modelId || preferredModel,
    previousArScore: input.previousArScore,
  })
}
