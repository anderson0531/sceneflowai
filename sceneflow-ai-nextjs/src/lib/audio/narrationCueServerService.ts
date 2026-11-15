import 'server-only'

import { getContainerAudioDurationSeconds } from '@/lib/audio/audioContainerDuration'
import {
  findCachedNarrationAudio,
  hashNarrationAudio,
  narrationAudioPathname,
  storeNarrationAudio,
} from '@/lib/blueprint/narrationAudioCache'
import { chunkNarrationText } from '@/lib/blueprint/sectionNarrationText'
import {
  resolveDialogueTtsVoice,
  type DialogueTtsCharacter,
} from '@/lib/character/dialogueTtsVoice'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import { promoLanguageName } from '@/lib/publish/promoLanguage'
import { resolvePromoNarrationVoiceId } from '@/lib/publish/promoNarrationVoice'
import {
  beatHasOnCameraDialogue,
  buildNarrationCueId,
  coerceNarrationAlignmentMode,
  computeNarrationCueFingerprint,
  estimateNarrationWordsDurationSec,
  normalizeNarrationCueShape,
} from '@/lib/script/sceneNarrationCues'
import {
  NARRATOR_CHARACTER,
  type NarrationAlignmentMode,
  type SceneBeat,
  type SceneNarrationCue,
} from '@/lib/script/segmentTypes'
import {
  DEFAULT_GEMINI_TTS_MODEL,
  NARRATION_CHUNK_BYTES,
  normalizeBlueprintGeminiVoiceId,
} from '@/lib/tts/blueprintTtsConstants'
import { synthesizeGeminiFlashMp3 } from '@/lib/tts/geminiFlashTts'
import { resolveGeminiTtsLanguageCode } from '@/lib/tts/googleTtsLocale'
import { generateText } from '@/lib/vertexai/gemini'

export interface ResolvedCueVoice {
  voiceId: string
  provider: 'google'
  directorNotes?: string
  speakerName: string
  characterId?: string
}

export function resolveNarrationCueSpeakerVoice(options: {
  cue: Pick<SceneNarrationCue, 'speakerType' | 'characterId' | 'characterName'>
  characters?: unknown[] | null
  narrationVoice?: unknown
}): ResolvedCueVoice {
  const castList = (Array.isArray(options.characters) ? options.characters : []) as Array<
    DialogueTtsCharacter & {
      role?: string
      voiceConfig?: {
        voiceId?: string
        provider?: string
        voicePrompt?: string
        description?: string
      } | null
    }
  >
  const narrVoiceObj =
    options.narrationVoice && typeof options.narrationVoice === 'object'
      ? (options.narrationVoice as {
          voiceId?: string
          voicePrompt?: string
          description?: string
        })
      : null

  if (options.cue.speakerType === 'character') {
    const resolved = resolveDialogueTtsVoice({
      characters: castList,
      characterId: options.cue.characterId ?? null,
      characterName: options.cue.characterName ?? null,
      kind: 'dialogue',
      narrationVoice: narrVoiceObj as any,
      logContext: 'narration-cue',
    })
    const vc = resolved.voiceConfig as
      | { voiceId?: string; voicePrompt?: string; description?: string }
      | null
      | undefined
    const rawVoiceId = vc?.voiceId?.trim()
    const voiceId = rawVoiceId
      ? normalizeBlueprintGeminiVoiceId(rawVoiceId)
      : resolvePromoNarrationVoiceId({
          characters: castList,
          narrationVoice: narrVoiceObj,
        })
    return {
      voiceId,
      provider: 'google',
      directorNotes: vc?.voicePrompt?.trim() || vc?.description?.trim() || undefined,
      speakerName:
        resolved.resolvedName || options.cue.characterName || NARRATOR_CHARACTER,
      characterId: resolved.resolvedCharacterId || options.cue.characterId,
    }
  }

  const voiceId = resolvePromoNarrationVoiceId({
    characters: castList,
    narrationVoice: narrVoiceObj,
  })
  return {
    voiceId,
    provider: 'google',
    directorNotes:
      narrVoiceObj?.voicePrompt?.trim() || narrVoiceObj?.description?.trim() || undefined,
    speakerName: NARRATOR_CHARACTER,
  }
}

export async function synthesizeNarrationCueMp3(options: {
  text: string
  language: string
  voiceId: string
  deliveryCue?: string
  directorNotes?: string
}): Promise<{ audioUrl: string; durationSec?: number } | null> {
  const cleanText = options.text.trim()
  if (!cleanText) return null

  try {
    const languageCode = resolveGeminiTtsLanguageCode(options.language)
    const voiceId = normalizeBlueprintGeminiVoiceId(options.voiceId)
    const model = process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_GEMINI_TTS_MODEL
    const deliveryKey = [options.directorNotes, options.deliveryCue]
      .filter(Boolean)
      .join('|')
    const pathname = narrationAudioPathname(
      hashNarrationAudio({
        text: deliveryKey ? `${cleanText}__${deliveryKey}` : cleanText,
        voiceId,
        languageCode,
        model,
      })
    )
    const cached = await findCachedNarrationAudio(pathname)
    if (cached) {
      return {
        audioUrl: cached,
        durationSec: estimateNarrationWordsDurationSec(cleanText),
      }
    }

    const chunks = chunkNarrationText(cleanText, NARRATION_CHUNK_BYTES)
    const buffers: Buffer[] = []
    for (const chunk of chunks) {
      buffers.push(
        await synthesizeGeminiFlashMp3({
          text: chunk,
          voiceId,
          languageCode,
          audioType: 'narration',
          directorNotes: options.directorNotes,
          deliveryCues: options.deliveryCue?.trim()
            ? [options.deliveryCue.trim()]
            : undefined,
        })
      )
    }
    const audio = buffers.length === 1 ? buffers[0]! : Buffer.concat(buffers)
    if (!audio.length) return null
    const stored = await storeNarrationAudio(pathname, audio)
    if (!stored) return null
    const probed = getContainerAudioDurationSeconds(audio)
    return {
      audioUrl: stored,
      durationSec:
        probed && probed > 0
          ? Math.round(probed * 10) / 10
          : estimateNarrationWordsDurationSec(cleanText),
    }
  } catch (err) {
    console.warn('[NarrationCueService] TTS synthesis error:', err)
    return null
  }
}

export async function translateNarrationCueText(options: {
  sourceText: string
  sourceLanguage?: string
  targetLanguage: string
  spanDurationSec: number
  speakerLabel?: string
  deliveryCue?: string
  contextSummary?: string
}): Promise<string> {
  const cleanSource = options.sourceText.trim()
  if (!cleanSource) return ''
  const targetLangName = promoLanguageName(options.targetLanguage)
  const targetWords = Math.max(3, Math.round(options.spanDurationSec * 2.15))

  const prompt = `Translate and time-adapt this spoken voiceover cue into ${targetLangName}.

Source voiceover (${promoLanguageName(options.sourceLanguage || 'en')}):
"${cleanSource}"

Visual window duration: ${options.spanDurationSec.toFixed(1)} seconds (~${targetWords} words spoken naturally).
Speaker: ${options.speakerLabel || 'Narrator'}
${options.deliveryCue ? `Vocal tone: ${options.deliveryCue}` : ''}
${options.contextSummary ? `Story context: ${options.contextSummary}` : ''}

Rules:
- Write natural, idiomatic, broadcast-grade ${targetLangName} that fits comfortably inside ${options.spanDurationSec.toFixed(1)} seconds when spoken aloud.
- Preserve emotional resonance, narrative point of view, and dramatic hook.
- Return ONLY the translated spoken text. No quotes, no JSON, no stage directions.`

  const result = await generateText(prompt, {
    model: getGeminiTextModel('flash'),
    temperature: 0.4,
    maxOutputTokens: 384,
    responseMimeType: 'text/plain',
    thinkingLevel: 'minimal',
  })

  const cleaned = (result.text || '')
    .replace(/^```(?:text|json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim()

  return cleaned || cleanSource
}

export interface NarrationShotPlanningInput {
  beatIndex: number
  beatId: string
  durationSec: number
  summary: string
  hasOnCameraDialogue: boolean
  dialoguePreview?: string
  trailerRole?: string
}

export function buildNarrationPlanningInputsFromBeats(
  beats: SceneBeat[],
  options?: { promoBeatPlan?: Array<{ label?: string; durationSec?: number; trailerRole?: string; included?: boolean }> }
): NarrationShotPlanningInput[] {
  const includedPlan = Array.isArray(options?.promoBeatPlan)
    ? options!.promoBeatPlan!.filter((p) => p?.included !== false)
    : undefined

  return beats.map((beat, idx) => {
    const planItem = includedPlan?.[idx]
    const hasDialogue = beatHasOnCameraDialogue(beat)
    const durationSec = Math.max(
      2,
      Math.round(
        planItem?.durationSec ??
          beat.durationSeconds ??
          5
      )
    )
    const summary =
      planItem?.label?.trim() ||
      beat.actionDescription?.trim() ||
      beat.beatDirection?.frozenMoment?.trim() ||
      (hasDialogue ? `${beat.character || 'Character'} speaks on camera` : `Shot ${idx + 1}`)

    return {
      beatIndex: idx,
      beatId: beat.beatId,
      durationSec,
      summary,
      hasOnCameraDialogue: hasDialogue,
      dialoguePreview: hasDialogue ? `${beat.character || 'CHARACTER'}: "${beat.line}"` : undefined,
      trailerRole: planItem?.trailerRole || beat.beatRole,
    }
  })
}

function buildFallbackPlannedCues(options: {
  shots: NarrationShotPlanningInput[]
  beats: SceneBeat[]
  language: string
  fallbackFullText?: string
  speakerType: 'narrator' | 'character'
  characterId?: string
  characterName?: string
}): SceneNarrationCue[] {
  // Group contiguous non-dialogue shots into spans of 1–3 shots
  const groups: Array<{ start: number; end: number; durationSec: number }> = []
  let current: { start: number; end: number; durationSec: number } | null = null

  for (const shot of options.shots) {
    if (shot.hasOnCameraDialogue) {
      if (current) {
        groups.push(current)
        current = null
      }
      continue
    }
    if (!current) {
      current = {
        start: shot.beatIndex,
        end: shot.beatIndex,
        durationSec: shot.durationSec,
      }
    } else if (current.end - current.start < 2 && current.durationSec + shot.durationSec <= 16) {
      current.end = shot.beatIndex
      current.durationSec += shot.durationSec
    } else {
      groups.push(current)
      current = {
        start: shot.beatIndex,
        end: shot.beatIndex,
        durationSec: shot.durationSec,
      }
    }
  }
  if (current) groups.push(current)

  if (groups.length === 0 && options.shots.length > 0) {
    groups.push({
      start: 0,
      end: options.shots.length - 1,
      durationSec: options.shots.reduce((s, sh) => s + sh.durationSec, 0),
    })
  }

  const sentences = (options.fallbackFullText || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const lang = options.language.trim().toLowerCase() || 'en'
  return groups.map((group, idx) => {
    const chunkText =
      sentences.length >= groups.length
        ? sentences
            .slice(
              Math.floor((idx * sentences.length) / groups.length),
              Math.floor(((idx + 1) * sentences.length) / groups.length)
            )
            .join(' ')
        : sentences[idx] || ''

    return normalizeNarrationCueShape(
      {
        cueId: buildNarrationCueId(group.start, group.end, idx),
        beatStart: group.start,
        beatEnd: group.end,
        speakerType: options.speakerType,
        characterId: options.characterId,
        characterName: options.characterName || NARRATOR_CHARACTER,
        alignmentMode: 'flow',
        volume: 1,
        byLanguage: chunkText ? { [lang]: { text: chunkText } } : {},
        generatedBy: 'ai-director',
        updatedAt: new Date().toISOString(),
      },
      options.beats
    )
  })
}

export async function planShotAlignedNarrationCuesWithModel(options: {
  title: string
  logline?: string
  genre?: string
  sceneHeading?: string
  isPromo?: boolean
  audienceText?: string
  campaignStrategyText?: string
  directorNotes?: string
  language: string
  beats: SceneBeat[]
  shots: NarrationShotPlanningInput[]
  speakerType?: 'narrator' | 'character'
  characterId?: string
  characterName?: string
  allowOverDialogue?: boolean
}): Promise<SceneNarrationCue[]> {
  const speakerType = options.speakerType === 'character' ? 'character' : 'narrator'
  const speakerName =
    speakerType === 'character' && options.characterName?.trim()
      ? options.characterName.trim()
      : NARRATOR_CHARACTER
  const lang = options.language.trim().toLowerCase() || 'en'
  const langName = promoLanguageName(lang)

  if (options.shots.length === 0) return []

  const shotListText = options.shots
    .map((s) => {
      const dialogueNote = s.hasOnCameraDialogue
        ? ` [ON-CAMERA DIALOGUE — KEEP CLEAR UNLESS ESSENTIAL: ${s.dialoguePreview}]`
        : ' [VISUAL / NO ON-CAMERA SPEECH]'
      const roleNote = s.trailerRole ? ` (${s.trailerRole})` : ''
      return `Shot ${s.beatIndex + 1} (index=${s.beatIndex}, ${s.durationSec}s)${roleNote}: ${s.summary}${dialogueNote}`
    })
    .join('\n')

  const styleGuide = options.isPromo
    ? 'Write punchy, high-craft film-trailer / promo voiceover cues that hook the audience, escalate stakes across visual cuts, and land a memorable closing button without spoilers.'
    : 'Write emotionally cohesive, cinematic voiceover narration cues aligned to the visual progression (ideal for Video Memoirs, Documentaries, Narrative V.O., or Explainers).'

  const prompt = `You are a veteran Film Trailer & Documentary Voiceover Director.
Plan shot-aligned Narration Cues across the ordered shots below in ${langName}.

Project: ${options.title}
${options.logline?.trim() ? `Logline: ${options.logline.trim()}` : ''}
${options.genre?.trim() ? `Genre: ${options.genre.trim()}` : ''}
${options.sceneHeading?.trim() ? `Scene: ${options.sceneHeading.trim()}` : ''}
Speaker: ${speakerName} (${speakerType === 'character' ? 'First-person / Character V.O.' : 'Narrator'})
${options.audienceText?.trim() ? `Target Audience:\n${options.audienceText.trim()}` : ''}
${options.campaignStrategyText?.trim() ? `Campaign Direction:\n${options.campaignStrategyText.trim()}` : ''}
${options.directorNotes?.trim() ? `Director Notes:\n${options.directorNotes.trim()}` : ''}

Ordered Shots (0-based indices 0..${options.shots.length - 1}):
${shotListText}

Rules:
1. ${styleGuide}
2. Group contiguous non-dialogue shots into natural multi-shot spans (\`beatStart\` <= \`beatEnd\`, e.g. \`beatStart: 0, beatEnd: 1\` spans Shots 1–2 continuously!) whenever one thought flows across cuts. Single-shot cues (\`beatStart === beatEnd\`) are also great for focused setups or closing tags.
3. ${
    options.allowOverDialogue
      ? 'Avoid talking over ON-CAMERA DIALOGUE shots when possible so character lip-sync breathes.'
      : 'DO NOT cover shots marked [ON-CAMERA DIALOGUE] — end the cue before a dialogue shot and start a new cue after it so on-camera dialogue plays cleanly!'
  }
4. Calibrate each cue's spoken word count strictly to ~2.1 words per second of its covered shot span so it fits naturally without rushing.
5. Choose \`alignmentMode\` per cue from:
   - \`"flow"\` (default: smooth continuous playback across the shot span)
   - \`"intro-freeze"\` (holds Frame 0 briefly to introduce a pivotal shot before motion starts)
   - \`"outro-freeze"\` (holds the final frame on a closing revelation or title beat)
   - \`"slow-mo-fit"\` (time-stretches fast action slightly in slow-motion under reflective V.O.)
6. Cues must be strictly ordered and non-overlapping (\`cue[i].beatEnd < cue[i+1].beatStart\`).
7. Write spoken \`text\` in ${langName} only (no stage directions or speaker labels inside \`text\`). Include a concise \`deliveryCue\` (e.g., "Warm, intimate reflection" or "Low, urgent trailer gravitas").

Return JSON ONLY matching this exact schema:
{
  "cues": [
    {
      "beatStart": 0,
      "beatEnd": 1,
      "text": "Spoken narration sentence(s) for this shot span.",
      "deliveryCue": "Warm, unhurried gravitas",
      "alignmentMode": "flow"
    }
  ]
}`

  try {
    const response = await generateText(prompt, {
      model: getGeminiTextModel('flash'),
      temperature: 0.65,
      maxOutputTokens: 1536,
      responseMimeType: 'application/json',
      thinkingLevel: 'minimal',
    })

    const rawText = (response.text || '')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
    const parsed = JSON.parse(rawText) as {
      cues?: Array<{
        beatStart?: number
        beatEnd?: number
        text?: string
        deliveryCue?: string
        alignmentMode?: NarrationAlignmentMode
      }>
    }

    const rawCues = Array.isArray(parsed?.cues) ? parsed.cues : []
    const valid: SceneNarrationCue[] = []
    let lastEnd = -1

    for (let i = 0; i < rawCues.length; i++) {
      const item = rawCues[i]
      if (!item || typeof item.text !== 'string' || !item.text.trim()) continue
      const start = Math.max(
        0,
        Math.min(options.beats.length - 1, Math.floor(Number(item.beatStart ?? 0)))
      )
      const end = Math.max(
        start,
        Math.min(options.beats.length - 1, Math.floor(Number(item.beatEnd ?? start)))
      )
      if (start <= lastEnd) continue
      lastEnd = end

      valid.push(
        normalizeNarrationCueShape(
          {
            cueId: buildNarrationCueId(start, end, valid.length),
            beatStart: start,
            beatEnd: end,
            speakerType,
            characterId: speakerType === 'character' ? options.characterId : undefined,
            characterName: speakerName,
            deliveryCue: item.deliveryCue?.trim() || undefined,
            alignmentMode: coerceNarrationAlignmentMode(item.alignmentMode, 'flow'),
            volume: 1,
            byLanguage: {
              [lang]: {
                text: item.text.replace(/^["'“”]+|["'“”]+$/g, '').trim(),
              },
            },
            generatedBy: 'ai-director',
            updatedAt: new Date().toISOString(),
          },
          options.beats
        )
      )
    }

    if (valid.length > 0) {
      return valid
    }
  } catch (err) {
    console.warn('[NarrationCueService] Model cue planning fell back to heuristic:', err)
  }

  return buildFallbackPlannedCues({
    shots: options.shots,
    beats: options.beats,
    language: lang,
    speakerType,
    characterId: options.characterId,
    characterName: speakerName,
  })
}

export async function synthesizeCuesForLanguages(options: {
  cues: SceneNarrationCue[]
  targetCueIds?: string[]
  languages: string[]
  beats: SceneBeat[]
  characters?: unknown[] | null
  narrationVoice?: unknown
  contextSummary?: string
  forceRegenerate?: boolean
}): Promise<SceneNarrationCue[]> {
  const targetSet =
    options.targetCueIds && options.targetCueIds.length > 0
      ? new Set(options.targetCueIds)
      : null

  const nextCues = options.cues.map((c) => ({
    ...c,
    byLanguage: { ...(c.byLanguage || {}) },
  }))

  for (const cue of nextCues) {
    if (targetSet && !targetSet.has(cue.cueId)) continue

    const resolvedVoice = resolveNarrationCueSpeakerVoice({
      cue,
      characters: options.characters,
      narrationVoice: options.narrationVoice,
    })

    // Calculate visual span duration for translation pacing
    let spanSec = 0
    for (let i = cue.beatStart; i <= cue.beatEnd; i++) {
      spanSec += Math.max(2, options.beats[i]?.durationSeconds ?? 5)
    }
    if (spanSec <= 0) spanSec = 5

    // Find baseline source text (prefer 'en', else first non-empty language)
    const baselineLang =
      cue.byLanguage.en?.text?.trim()
        ? 'en'
        : Object.keys(cue.byLanguage).find((k) => cue.byLanguage[k]?.text?.trim()) || 'en'
    const baselineText = cue.byLanguage[baselineLang]?.text?.trim() || ''

    for (const rawLang of options.languages) {
      const lang = rawLang.trim().toLowerCase() || 'en'
      let text = cue.byLanguage[lang]?.text?.trim() || ''

      if (!text && baselineText && lang !== baselineLang) {
        text = await translateNarrationCueText({
          sourceText: baselineText,
          sourceLanguage: baselineLang,
          targetLanguage: lang,
          spanDurationSec: spanSec,
          speakerLabel: resolvedVoice.speakerName,
          deliveryCue: cue.deliveryCue,
          contextSummary: options.contextSummary,
        })
      }

      if (!text) continue

      const fingerprint = computeNarrationCueFingerprint({
        text,
        speakerType: cue.speakerType,
        characterId: cue.characterId,
        voiceId: resolvedVoice.voiceId,
        deliveryCue: cue.deliveryCue,
        language: lang,
      })

      const existing = cue.byLanguage[lang]
      if (
        !options.forceRegenerate &&
        existing?.audioUrl?.trim() &&
        existing.sourceFingerprint === fingerprint
      ) {
        continue
      }

      const synthesized = await synthesizeNarrationCueMp3({
        text,
        language: lang,
        voiceId: resolvedVoice.voiceId,
        deliveryCue: cue.deliveryCue,
        directorNotes: resolvedVoice.directorNotes,
      })

      cue.byLanguage[lang] = {
        text,
        ...(synthesized?.audioUrl
          ? { audioUrl: synthesized.audioUrl }
          : existing?.audioUrl
            ? { audioUrl: existing.audioUrl }
            : {}),
        ...(synthesized?.durationSec
          ? { durationSec: synthesized.durationSec }
          : existing?.durationSec
            ? { durationSec: existing.durationSec }
            : {}),
        voiceId: resolvedVoice.voiceId,
        provider: resolvedVoice.provider,
        generatedAt: new Date().toISOString(),
        sourceFingerprint: fingerprint,
      }
      cue.updatedAt = new Date().toISOString()
    }
  }

  return nextCues.map((c) => normalizeNarrationCueShape(c, options.beats))
}
