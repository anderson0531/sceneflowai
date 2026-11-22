import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { v4 as uuidv4 } from 'uuid'
import { inspectMediaWithFfmpeg, runFfmpeg } from '@/lib/ffmpeg/runFfmpeg'
import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import { generateWithVision } from '@/lib/vertexai/gemini'
import { pickGeminiBaseVoice } from '@/lib/tts/pickGeminiBaseVoice'
import type {
  AcousticVoiceDnaPayload,
  ClientMediaChapter,
} from '@/models/ClientAssetSubmission'
import {
  getGoogleVoiceCloneConsentForLocale,
  resolveGoogleVoiceCloneLanguageCode,
} from '@/lib/continuity/voiceConsentScripts'

const VALID_REGISTERS = new Set(['low', 'low-mid', 'mid', 'mid-high', 'high'] as const)
const VALID_WEIGHTS = new Set(['light', 'medium', 'heavy'] as const)

/**
 * Fast RIFF/WAVE header check for 24kHz mono 16-bit PCM WAV.
 * Lets us skip redundant FFmpeg transcoding when input is already Google-ready LINEAR16.
 */
export function isValid24kMonoLinear16Wav(buf: Buffer): boolean {
  if (!buf || buf.length < 44) return false
  if (buf.toString('ascii', 0, 4) !== 'RIFF') return false
  if (buf.toString('ascii', 8, 12) !== 'WAVE') return false
  const audioFormat = buf.readUInt16LE(20)
  const channels = buf.readUInt16LE(22)
  const sampleRate = buf.readUInt32LE(24)
  const bitsPerSample = buf.readUInt16LE(34)
  return audioFormat === 1 && channels === 1 && sampleRate === 24000 && bitsPerSample === 16
}

/**
 * Parse duration (seconds) and orientation from `ffmpeg -hide_banner -i` stderr.
 */
export function parseFfmpegInspection(stderr: string): {
  durationSeconds: number | null
  aspectOrientation: 'landscape' | 'portrait' | 'square' | null
} {
  let durationSeconds: number | null = null
  const durMatch = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/i)
  if (durMatch) {
    const hours = Number(durMatch[1])
    const mins = Number(durMatch[2])
    const secs = Number(durMatch[3])
    const total = hours * 3600 + mins * 60 + secs
    if (Number.isFinite(total) && total > 0) {
      durationSeconds = Math.round(total * 10) / 10
    }
  }

  let aspectOrientation: 'landscape' | 'portrait' | 'square' | null = null
  const videoLine = stderr
    .split(/\r?\n/)
    .find((line) => /Video:/i.test(line))
  if (videoLine) {
    const dimMatch = videoLine.match(/,\s*(\d{2,5})x(\d{2,5})(?:[\s,\[]|$)/)
    if (dimMatch) {
      let w = Number(dimMatch[1])
      let h = Number(dimMatch[2])
      // Account for mobile rotation metadata (e.g. iPhone vertical videos rotated 90/270 deg)
      const rotMatch = stderr.match(/rotate\s*:\s*(-?\d+)|rotation of\s*(-?\d+(?:\.\d+)?)/i)
      const rot = rotMatch ? Math.abs(Number(rotMatch[1] || rotMatch[2] || 0)) : 0
      if (rot === 90 || rot === 270) {
        const tmp = w
        w = h
        h = tmp
      }
      if (w > 0 && h > 0) {
        if (Math.abs(w - h) / Math.max(w, h) < 0.08) aspectOrientation = 'square'
        else aspectOrientation = h > w ? 'portrait' : 'landscape'
      }
    }
  }

  return { durationSeconds, aspectOrientation }
}

/**
 * Convert an arbitrary audio/video buffer to Google Chirp 3 LINEAR16 24kHz mono WAV.
 * Optionally slices a clean window (`startSeconds`, `maxDurationSeconds`) for voice cloning.
 */
export async function convertBufferTo24kMonoWav(
  inputBuffer: Buffer,
  options?: {
    extHint?: string
    startSeconds?: number
    maxDurationSeconds?: number
    applySpeechPolish?: boolean
  }
): Promise<Buffer> {
  if (!options?.startSeconds && !options?.maxDurationSeconds && !options?.applySpeechPolish) {
    if (isValid24kMonoLinear16Wav(inputBuffer)) {
      return inputBuffer
    }
  }

  const ext = (options?.extHint || 'tmp').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'tmp'
  const inputPath = join(tmpdir(), `${uuidv4()}_vc_in.${ext}`)
  const outputPath = join(tmpdir(), `${uuidv4()}_vc_out.wav`)

  try {
    await writeFile(inputPath, inputBuffer)

    const buildArgs = (withPolish: boolean): string[] => {
      const args: string[] = ['-y']
      if (options?.startSeconds && options.startSeconds > 0) {
        args.push('-ss', String(options.startSeconds))
      }
      args.push('-i', inputPath, '-vn')
      if (options?.maxDurationSeconds && options.maxDurationSeconds > 0) {
        args.push('-t', String(options.maxDurationSeconds))
      }
      if (withPolish) {
        args.push('-af', 'highpass=f=80,afftdn=nf=-25,loudnorm=I=-16:TP=-1.5:LRA=11')
      }
      args.push('-acodec', 'pcm_s16le', '-ar', '24000', '-ac', '1', '-f', 'wav', outputPath)
      return args
    }

    try {
      await runFfmpeg(buildArgs(Boolean(options?.applySpeechPolish)))
    } catch (polishErr) {
      if (!options?.applySpeechPolish) throw polishErr
      console.warn('[voiceDnaService] Speech polish WAV filter failed, retrying clean WAV:', polishErr)
      await runFfmpeg(buildArgs(false))
    }

    return await readFile(outputPath)
  } finally {
    await unlink(inputPath).catch(() => {})
    await unlink(outputPath).catch(() => {})
  }
}

/**
 * Given a customer-uploaded video or audio buffer, extracts:
 *  1) A clean, loudness-normalized MP3 speech stem (usable directly as memoir narration VO!)
 *  2) A clean 15–20s 24kHz mono LINEAR16 WAV slice (for Google Instant Custom Voice & Gemini DNA)
 *  3) Duration & video orientation metadata
 */
export async function extractPolishedSpeechAssetsFromMedia(
  inputBuffer: Buffer,
  mimeType: string
): Promise<{
  polishedMp3Buffer: Buffer
  referenceSliceWavBuffer: Buffer
  durationSeconds: number | null
  aspectOrientation: 'landscape' | 'portrait' | 'square' | null
}> {
  if (!inputBuffer.length) {
    throw new Error('Media buffer is empty')
  }

  const ext = mimeType.includes('quicktime')
    ? 'mov'
    : mimeType.includes('webm')
      ? 'webm'
      : mimeType.includes('mp4') || mimeType.includes('m4a')
        ? 'mp4'
        : mimeType.includes('wav')
          ? 'wav'
          : mimeType.includes('mpeg') || mimeType.includes('mp3')
            ? 'mp3'
            : 'bin'

  const inputPath = join(tmpdir(), `${uuidv4()}_media_in.${ext}`)
  const mp3Path = join(tmpdir(), `${uuidv4()}_speech_stem.mp3`)
  const wavPath = join(tmpdir(), `${uuidv4()}_voice_ref.wav`)

  try {
    await writeFile(inputPath, inputBuffer)
    const inspectionRaw = await inspectMediaWithFfmpeg(inputPath).catch(() => '')
    const { durationSeconds, aspectOrientation } = parseFfmpegInspection(inspectionRaw)

    // 1) Full cleaned narration stem (MP3) with gentle room-cleanup + -16 LUFS vocal polish
    try {
      await runFfmpeg([
        '-y',
        '-i',
        inputPath,
        '-vn',
        '-af',
        'highpass=f=80,afftdn=nf=-25,loudnorm=I=-16:TP=-1.5:LRA=11',
        '-acodec',
        'libmp3lame',
        '-b:a',
        '128k',
        '-ar',
        '44100',
        '-ac',
        '1',
        '-f',
        'mp3',
        mp3Path,
      ])
    } catch (filterErr) {
      console.warn('[voiceDnaService] MP3 polish filter fallback:', filterErr)
      await runFfmpeg([
        '-y',
        '-i',
        inputPath,
        '-vn',
        '-acodec',
        'libmp3lame',
        '-b:a',
        '128k',
        '-ar',
        '44100',
        '-ac',
        '1',
        '-f',
        'mp3',
        mp3Path,
      ])
    }

    // 2) Clean 15-20s 24kHz mono LINEAR16 WAV reference slice for Google voice cloning
    const sliceStart = durationSeconds && durationSeconds > 18 ? 0.5 : 0
    const sliceDuration = 20
    const wavArgs = ['-y']
    if (sliceStart > 0) wavArgs.push('-ss', String(sliceStart))
    wavArgs.push(
      '-i',
      mp3Path,
      '-t',
      String(sliceDuration),
      '-acodec',
      'pcm_s16le',
      '-ar',
      '24000',
      '-ac',
      '1',
      '-f',
      'wav',
      wavPath
    )
    await runFfmpeg(wavArgs)

    const [polishedMp3Buffer, referenceSliceWavBuffer] = await Promise.all([
      readFile(mp3Path),
      readFile(wavPath),
    ])

    return {
      polishedMp3Buffer,
      referenceSliceWavBuffer,
      durationSeconds,
      aspectOrientation,
    }
  } finally {
    await unlink(inputPath).catch(() => {})
    await unlink(mp3Path).catch(() => {})
    await unlink(wavPath).catch(() => {})
  }
}

export function normalizeClientMediaChapters(
  rawChapters: unknown,
  maxDurationSec?: number | null
): ClientMediaChapter[] {
  if (!Array.isArray(rawChapters)) return []
  const out: ClientMediaChapter[] = []
  for (const item of rawChapters.slice(0, 12)) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const startRaw = Number(rec.startSeconds ?? rec.start_seconds ?? 0)
    const endRaw = Number(rec.endSeconds ?? rec.end_seconds ?? startRaw + 10)
    if (!Number.isFinite(startRaw) || !Number.isFinite(endRaw)) continue
    const startSeconds = Math.max(0, Math.round(startRaw * 10) / 10)
    const capEnd =
      maxDurationSec && Number.isFinite(maxDurationSec)
        ? Math.min(maxDurationSec, endRaw)
        : endRaw
    const endSeconds = Math.max(startSeconds + 1, Math.round(capEnd * 10) / 10)
    const title = String(rec.title || `Chapter ${out.length + 1}`)
      .trim()
      .slice(0, 90)
    const quote = String(rec.quote || rec.summary || '')
      .trim()
      .slice(0, 260)
    const usageRaw = String(rec.suggestedUsage ?? rec.suggested_usage ?? '').toLowerCase()
    const suggestedUsage: 'live_intro' | 'reenactment_vo' =
      usageRaw === 'live_intro' ? 'live_intro' : 'reenactment_vo'
    out.push({ title, startSeconds, endSeconds, quote, suggestedUsage })
  }
  return out
}

export function normalizeAcousticVoiceDna(
  raw: Record<string, unknown>,
  speakerName?: string,
  durationSeconds?: number | null
): {
  dna: AcousticVoiceDnaPayload
  transcript: string
  chapters: ClientMediaChapter[]
  bestVoiceSliceWindow: { startSeconds: number; endSeconds: number; reason?: string } | null
} {
  const vaRaw = (raw.vocalAttributes || raw.vocal_attributes || raw) as Record<string, unknown>

  const registerRaw = String(vaRaw.register || 'mid').trim().toLowerCase()
  const register = VALID_REGISTERS.has(registerRaw as any)
    ? (registerRaw as AcousticVoiceDnaPayload['vocalAttributes']['register'])
    : 'mid'

  const weightRaw = String(vaRaw.vocalWeight || vaRaw.vocal_weight || 'medium').trim().toLowerCase()
  const vocalWeight = VALID_WEIGHTS.has(weightRaw as any)
    ? (weightRaw as AcousticVoiceDnaPayload['vocalAttributes']['vocalWeight'])
    : 'medium'

  const wpmNum = Number(vaRaw.wpm)
  const wpm = Number.isFinite(wpmNum) ? Math.min(200, Math.max(85, Math.round(wpmNum))) : 135

  const timbre = String(vaRaw.timbre || 'warm, natural conversational voice').trim().slice(0, 140)
  const accent = String(vaRaw.accent || 'General American').trim().slice(0, 80)
  const cadence = String(vaRaw.cadence || 'measured, unhurried conversational rhythm')
    .trim()
    .slice(0, 120)
  const emotionalState = String(vaRaw.emotionalState || vaRaw.emotional_state || 'warm, reflective, grounded')
    .trim()
    .slice(0, 120)
  const inflection = String(vaRaw.inflection || 'natural phrasing with gentle downward resolution')
    .trim()
    .slice(0, 140)
  const tone = String(vaRaw.tone || 'authentic, intimate documentary narration')
    .trim()
    .slice(0, 120)

  const genderRaw = String(raw.gender || '').trim().toLowerCase()
  const gender =
    genderRaw === 'male' || genderRaw === 'female' ? genderRaw : undefined
  const apparentAge = String(raw.apparentAge || raw.apparent_age || '').trim().slice(0, 48) || undefined

  const rawDesignPrompt = String(raw.voiceDesignPrompt || raw.voice_design_prompt || '').trim()
  const fallbackDesignPrompt = [
    apparentAge ? `${apparentAge}` : '',
    gender || 'adult',
    `${register} register, ${vocalWeight} vocal weight,`,
    `${timbre}, ${accent} accent,`,
    `${cadence} (~${wpm} WPM), ${tone}.`,
  ]
    .filter(Boolean)
    .join(' ')
  const voiceDesignPrompt = (rawDesignPrompt || fallbackDesignPrompt).slice(0, 285)

  const rawVeoCue = String(raw.veoVoiceCue || raw.veo_voice_cue || '').trim()
  const fallbackVeoCue = `${timbre} (${apparentAge || 'adult'} ${gender || 'speaker'}, ${accent} accent, ${cadence}, ${tone})`
  const veoVoiceCue = (rawVeoCue || fallbackVeoCue).slice(0, 240)

  const rawSummary = String(raw.summary || '').trim()
  const summary = (
    rawSummary ||
    `${apparentAge ? `${apparentAge} ` : ''}${timbre} · ${accent} · ~${wpm} WPM`
  ).slice(0, 160)

  const vocalAttributes: AcousticVoiceDnaPayload['vocalAttributes'] = {
    register,
    vocalWeight,
    timbre,
    accent,
    cadence,
    wpm,
    emotionalState,
    inflection,
    tone,
  }

  let recommendedGeminiBaseVoice: string | undefined
  try {
    const picked = pickGeminiBaseVoice(voiceDesignPrompt, {
      gender,
      age: apparentAge,
      name: speakerName,
      vocalAttributes,
    })
    recommendedGeminiBaseVoice = picked.voiceId
  } catch {
    recommendedGeminiBaseVoice = undefined
  }

  const transcript = String(raw.transcript || '').trim().slice(0, 4000)
  const chapters = normalizeClientMediaChapters(raw.chapters, durationSeconds)

  let bestVoiceSliceWindow: { startSeconds: number; endSeconds: number; reason?: string } | null =
    null
  const rawWin = (raw.bestVoiceSliceWindow || raw.best_voice_slice_window) as
    | Record<string, unknown>
    | undefined
  if (rawWin && typeof rawWin === 'object') {
    const s = Number(rawWin.startSeconds ?? rawWin.start_seconds)
    const e = Number(rawWin.endSeconds ?? rawWin.end_seconds)
    if (Number.isFinite(s) && Number.isFinite(e) && e > s + 2) {
      bestVoiceSliceWindow = {
        startSeconds: Math.max(0, Math.round(s * 10) / 10),
        endSeconds: Math.round(e * 10) / 10,
        reason: rawWin.reason ? String(rawWin.reason).trim().slice(0, 120) : undefined,
      }
    }
  }

  return {
    dna: {
      summary,
      gender,
      apparentAge,
      vocalAttributes,
      voiceDesignPrompt,
      veoVoiceCue,
      recommendedGeminiBaseVoice,
    },
    transcript,
    chapters,
    bestVoiceSliceWindow,
  }
}

/**
 * Multimodal Audio -> Acoustic Voice DNA + Verbatim Transcript + Auto-Chapters via Gemini Flash.
 * Produces a permanent 0-slot voice representation stored in PostgreSQL that drives:
 *   - Veo in-scene dialogue voice matching (`veoVoiceCue`)
 *   - Gemini 3.8 Flash JIT LRU voice pool (`voiceDesignPrompt`)
 *   - 0-slot Gemini Base Voice + Director Notes (`recommendedGeminiBaseVoice` + `vocalAttributes`)
 *   - Time-coded story chapters (`chapters`) and cleanest voice cloning slice (`bestVoiceSliceWindow`)
 */
export async function analyzeAudioToAcousticVoiceDna(input: {
  audioBuffer: Buffer
  mimeType: string
  speakerName?: string
  languageCode?: string
  includeChapters?: boolean
  durationSeconds?: number | null
}): Promise<{
  dna: AcousticVoiceDnaPayload
  transcript: string
  chapters: ClientMediaChapter[]
  bestVoiceSliceWindow: { startSeconds: number; endSeconds: number; reason?: string } | null
}> {
  // Keep inline audio payload comfortably under Vertex inlineData limits (~6 MB max)
  const cappedAudio =
    input.audioBuffer.length > 6 * 1024 * 1024
      ? input.audioBuffer.subarray(0, 6 * 1024 * 1024)
      : input.audioBuffer

  const safeMime =
    input.mimeType.startsWith('audio/') ? input.mimeType : 'audio/mpeg'

  const chapterInstructions = input.includeChapters
    ? `,
  "chapters": [
    {
      "title": "Short chapter title (e.g. Arriving in Chicago)",
      "startSeconds": 0,
      "endSeconds": 18,
      "quote": "Short memorable verbatim quote from this segment",
      "suggestedUsage": "live_intro" | "reenactment_vo"
    }
  ],
  "bestVoiceSliceWindow": {
    "startSeconds": 2,
    "endSeconds": 16,
    "reason": "Clean uninterrupted solo speech without pauses or background noise"
  }`
    : ''

  const prompt = `You are a master Voice Casting Director, Documentary Story Editor, & Acoustic Analyst.
Listen carefully to the attached real human voice recording${input.speakerName ? ` of "${input.speakerName}"` : ''}.

Analyze the speaker's EXACT acoustic vocal characteristics and transcribe what they say verbatim.${
    input.includeChapters
      ? ' Also break the recording into 1 to 8 natural time-coded story chapters (with timestamps in seconds) and identify the cleanest 10-18 second uninterrupted speech window for voice cloning.'
      : ''
  }
Return ONLY valid JSON matching this exact structure:
{
  "summary": "Short 1-line label, e.g. Warm 70s Midwestern baritone, gentle gravel, ~120 WPM",
  "gender": "male" | "female" | "neutral",
  "apparentAge": "e.g. late 60s, mid 30s, early 70s",
  "vocalAttributes": {
    "register": "low" | "low-mid" | "mid" | "mid-high" | "high",
    "vocalWeight": "light" | "medium" | "heavy",
    "timbre": "Specific vocal body & texture (warmth, resonance, rasp/gravel, breathiness, nasality, clarity)",
    "accent": "Exact regional/national accent heard in the audio",
    "cadence": "Pace, pausing habits, rhythmic flow",
    "wpm": 130,
    "emotionalState": "Standing vocal affect & warmth",
    "inflection": "Pitch contour & phrasing habits",
    "tone": "Overall delivery colour"
  },
  "voiceDesignPrompt": "Purely vocal/acoustic description under 260 characters suitable for synthesizing a matching voice. Do NOT include any names, clothes, appearance, or script lines.",
  "veoVoiceCue": "Concise 1-sentence vocal matching instruction for on-camera video dialogue (age, timbre, accent, pace, warmth).",
  "transcript": "Accurate verbatim transcript of the spoken words in the recording (in the spoken language)."${chapterInstructions}
}

STRICT RULES:
1. Base every trait strictly on what you HEAR in the audio.
2. voiceDesignPrompt MUST be under 260 characters and describe ONLY vocal acoustics.
3. Return raw JSON only, no markdown fences.`

  const res = await generateWithVision(
    [
      { text: prompt },
      {
        inlineData: {
          mimeType: safeMime,
          data: cappedAudio.toString('base64'),
        },
      },
    ],
    {
      temperature: 0.15,
      maxOutputTokens: input.includeChapters ? 3072 : 2048,
      responseMimeType: 'application/json',
      thinkingLevel: 'minimal',
    }
  )

  const cleaned = res.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')

  const parsed = JSON.parse(cleaned) as Record<string, unknown>
  return normalizeAcousticVoiceDna(parsed, input.speakerName, input.durationSeconds)
}

/**
 * Fast Gemini multimodal transcription for "Tell the story behind this photo" voice notes.
 */
export async function transcribePhotoVoiceNote(input: {
  audioBuffer: Buffer
  mimeType: string
  slotName?: string
}): Promise<string> {
  const cappedAudio =
    input.audioBuffer.length > 4 * 1024 * 1024
      ? input.audioBuffer.subarray(0, 4 * 1024 * 1024)
      : input.audioBuffer
  const safeMime = input.mimeType.startsWith('audio/') ? input.mimeType : 'audio/webm'

  const res = await generateWithVision(
    [
      {
        text: `Transcribe this short spoken memory about a family/reference photo${
          input.slotName ? ` ("${input.slotName}")` : ''
        }. Return ONLY the clean verbatim transcript text in the spoken language, with no quotes or preamble.`,
      },
      {
        inlineData: {
          mimeType: safeMime,
          data: cappedAudio.toString('base64'),
        },
      },
    ],
    {
      temperature: 0.1,
      maxOutputTokens: 1024,
      thinkingLevel: 'minimal',
    }
  )

  return res.text.trim().replace(/^["']|["']$/g, '').slice(0, 2000)
}

export type GoogleVoiceCloneResult =
  | {
      status: 'minted'
      voiceCloningKey: string
      languageCode: string
    }
  | {
      status: 'fallback_tier2'
      reason:
        | 'billing_disabled'
        | 'not_allowlisted'
        | 'consent_mismatch'
        | 'audio_invalid'
        | 'no_credentials'
        | 'unavailable'
      httpStatus: number
      detail: string
      languageCode: string
    }

export function classifyGoogleVoiceCloneError(
  httpStatus: number,
  detail: string
): Extract<GoogleVoiceCloneResult, { status: 'fallback_tier2' }>['reason'] {
  if (/BILLING_DISABLED|requires billing to be enabled/i.test(detail)) {
    return 'billing_disabled'
  }
  if (
    httpStatus === 403 ||
    /allowlist|allow-list|not enabled|PERMISSION_DENIED|ACCESS_DENIED|SERVICE_DISABLED/i.test(detail)
  ) {
    return 'not_allowlisted'
  }
  if (/consent|verification failed|script mismatch|voiceTalentConsent/i.test(detail)) {
    return 'consent_mismatch'
  }
  if (httpStatus === 400 || /too short|INVALID_ARGUMENT|sample rate|audio/i.test(detail)) {
    return 'audio_invalid'
  }
  return 'unavailable'
}

/**
 * Resolve GCP project ID for `x-goog-user-project` quota/billing header.
 */
function resolveGcpProjectId(): string | undefined {
  if (process.env.VERTEX_PROJECT_ID?.trim()) return process.env.VERTEX_PROJECT_ID.trim()
  if (process.env.GCP_PROJECT_ID?.trim()) return process.env.GCP_PROJECT_ID.trim()
  const rawCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (rawCreds) {
    try {
      const parsed = JSON.parse(rawCreds) as { project_id?: string }
      if (parsed.project_id) return parsed.project_id
    } catch {
      const m = rawCreds.match(/"project_id"\s*:\s*"([^"]+)"/)
      if (m?.[1]) return m[1]
    }
  }
  return undefined
}

/**
 * Attempts Tier 1 stateless Google Chirp 3 Instant Custom Voice (`voices:generateVoiceCloningKey`).
 * Zero saved provider slots! Automatically classifies 403/billing/allowlist/consent errors so
 * callers gracefully degrade to Tier 2 Acoustic Voice DNA without ever blocking the user.
 */
export async function tryMintGoogleVoiceCloningKey(input: {
  referenceWavBuffer: Buffer
  consentAudioBuffer: Buffer
  localeOrLanguageCode?: string | null
}): Promise<GoogleVoiceCloneResult> {
  const { languageCode: consentLang, script: consentScript } =
    getGoogleVoiceCloneConsentForLocale(input.localeOrLanguageCode)
  const languageCode = resolveGoogleVoiceCloneLanguageCode(
    input.localeOrLanguageCode || consentLang
  )

  let accessToken: string | null = null
  const apiKey = process.env.GOOGLE_API_KEY?.trim() || null
  try {
    accessToken = await getVertexAIAuthToken()
  } catch {
    accessToken = null
  }

  if (!accessToken && !apiKey) {
    return {
      status: 'fallback_tier2',
      reason: 'no_credentials',
      httpStatus: 500,
      detail: 'Google Cloud credentials are not configured',
      languageCode,
    }
  }

  const [refWav, consentWav] = await Promise.all([
    convertBufferTo24kMonoWav(input.referenceWavBuffer, { maxDurationSeconds: 25 }),
    convertBufferTo24kMonoWav(input.consentAudioBuffer, { maxDurationSeconds: 20 }),
  ])

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
    const gcpProject = resolveGcpProjectId()
    if (gcpProject) {
      headers['x-goog-user-project'] = gcpProject
    }
  } else if (apiKey) {
    headers['X-Goog-Api-Key'] = apiKey
  }

  const requestBody = {
    languageCode,
    consentScript,
    referenceAudio: {
      audioConfig: {
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 24000,
      },
      audioBytes: refWav.toString('base64'),
    },
    voiceTalentConsent: {
      audioConfig: {
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 24000,
      },
      audioBytes: consentWav.toString('base64'),
    },
  }

  const response = await fetch(
    'https://texttospeech.googleapis.com/v1beta1/voices:generateVoiceCloningKey',
    {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    }
  )

  const rawText = await response.text().catch(() => '')
  let parsed: Record<string, any> = {}
  try {
    parsed = rawText ? (JSON.parse(rawText) as Record<string, any>) : {}
  } catch {
    parsed = {}
  }

  if (!response.ok) {
    const detail = parsed?.error?.message || rawText.slice(0, 400) || `HTTP ${response.status}`
    return {
      status: 'fallback_tier2',
      reason: classifyGoogleVoiceCloneError(response.status, detail),
      httpStatus: response.status,
      detail,
      languageCode,
    }
  }

  if (typeof parsed.voiceCloningKey === 'string' && parsed.voiceCloningKey.trim()) {
    return {
      status: 'minted',
      voiceCloningKey: parsed.voiceCloningKey.trim(),
      languageCode,
    }
  }

  return {
    status: 'fallback_tier2',
    reason: 'unavailable',
    httpStatus: 502,
    detail: 'Google did not return a voiceCloningKey',
    languageCode,
  }
}
