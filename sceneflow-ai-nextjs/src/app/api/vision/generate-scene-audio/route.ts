import { NextRequest, NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { optimizeTextForTTS, optimizeTextForGeminiTTS, finalizeTextForGoogleTts, finalizeTextForGeminiTts } from '../../../../lib/tts/textOptimizer'
import { getAudioDurationFromBuffer } from '../../../../lib/audio/serverAudioDuration'
import { translateWithVertexAI } from '../../../../lib/vertexai/translate'
import { getVertexAIAuthToken } from '../../../../lib/vertexai/client'
import { adaptScriptForTranslationTiming, type AdaptationDiagnostics } from '../../../../lib/translation/scriptAdaptation'
import { GoogleTtsBlockedError, parseVertexTtsPolicyViolation } from '../../../../lib/tts/googleTtsPolicy'
import {
  GoogleTtsRateLimitedError,
  backoffMsFor429Attempt,
  backoffMsForPolicyAttempt,
  getGoogleTts429MaxRetries,
  getGoogleTtsPolicyMaxRetries,
  parseVertexTtsRateLimit,
  sleep,
} from '../../../../lib/tts/googleTtsRetry'
import { synthesizeElevenLabsMp3 } from '../../../../lib/elevenlabs/textToSpeech'
import { synthesizeEdgeMp3 } from '../../../../lib/tts/synthesizeEdgeMp3'
import { resolveEdgeVoiceForCharacter, getEdgeVoiceConfigForResolution, getEdgeVoiceLanguageFromId } from '../../../../lib/tts/edgeTtsVoices'
import { matchCharacterRecord } from '../../../../lib/character/canonical'
import type { EdgeVoiceConfig } from '../../../../types/vision'
import {
  isEdgeTtsFallbackEnabled,
  isQuotaOrRateLimitError,
} from '../../../../lib/tts/edgeTtsFallback'
import { buildGeminiTtsPrompt } from '../../../../lib/tts/geminiTtsPrompt'
import { resolveCharacterVoicePrompt } from '../../../../lib/tts/resolveCharacterVoicePrompt'
import { buildGeminiTtsAdvancedVoiceOptions } from '../../../../lib/tts/geminiTtsSafety'
import { persistSceneAudioAtomic } from '../../../../lib/audio/persistSceneAudioAtomic'

export const maxDuration = 60
export const runtime = 'nodejs'

interface VoiceConfig {
  provider: 'google' | 'elevenlabs'
  voiceId: string
  voiceName: string
  stability?: number
  similarityBoost?: number
  languageCode?: string
  prompt?: string
}

function normalizeVoiceConfig(voiceConfig: VoiceConfig): VoiceConfig {
  const vc = { ...voiceConfig }
  let provider = vc.provider
  if (provider !== 'google' && provider !== 'elevenlabs') {
    provider = vc.voiceId?.startsWith('gemini-') ? 'google' : 'elevenlabs'
  }

  const vid = vc.voiceId || ''
  const looksLikeElevenLabsLibrary =
    vid.length >= 20 &&
    vid.length <= 24 &&
    /^[a-zA-Z0-9]+$/.test(vid) &&
    !vid.startsWith('gemini')

  if (provider === 'google' && looksLikeElevenLabsLibrary) {
    provider = 'elevenlabs'
  }

  if (provider === 'elevenlabs') {
    const isGoogleVoice =
      vid.includes('Studio') || /^[a-z]{2}-[A-Z]{2}/.test(vid)
    if (isGoogleVoice && !vid.startsWith('gemini')) {
      provider = 'google'
    }
  }

  return { ...vc, provider }
}

interface AudioGenerationRequest {
  projectId: string
  sceneIndex: number
  audioType: 'narration' | 'dialogue' | 'description'
  text: string
  voiceConfig: VoiceConfig
  characterName?: string // For dialogue
  dialogueIndex?: number // For dialogue - index of the dialog line in the scene
  /** Stable per-line id from the segmented script (preferred). When provided
   *  the persisted audio entry will include `lineId` so future lookups match
   *  by id instead of positional index. Optional. */
  lineId?: string
  /** Optional kind discriminator: 'narration' lines are stored alongside
   *  dialogue with kind='narration'. Defaults to 'dialogue' for the
   *  audioType='dialogue' branch and 'narration' for audioType='narration'. */
  lineKind?: 'narration' | 'dialogue'
  /** Optional character id for the line (NARRATOR resolves to 'narrator'). */
  characterId?: string
  language?: string // Target language for TTS (default: 'en')
  skipTranslation?: boolean // Skip server-side translation (text is already translated)
  skipDbUpdate?: boolean // Skip database update if called from batch generation
  /** Client-resolved Edge fallback voice (avoids stale DB lookup). */
  edgeVoiceConfig?: EdgeVoiceConfig
  /** Client-resolved character gender for Edge fallback. */
  characterGender?: string
}

export async function POST(req: NextRequest) {
  try {
    const parsed = (await req.json()) as AudioGenerationRequest & {
      text: string
      skipDbUpdate?: boolean
    }

    if (!parsed.voiceConfig || typeof parsed.voiceConfig !== 'object') {
      return NextResponse.json({ error: 'Missing required fields: voiceConfig' }, { status: 400 })
    }

    const voiceConfig = normalizeVoiceConfig(parsed.voiceConfig as VoiceConfig)
    const {
      projectId,
      sceneIndex,
      audioType,
      text,
      characterName,
      dialogueIndex,
      lineId,
      lineKind,
      characterId,
      language: requestedLanguage,
      skipTranslation,
      skipDbUpdate = false,
      edgeVoiceConfig: clientEdgeVoiceConfig,
      characterGender: clientCharacterGender,
    } = parsed

    // Log the request for debugging
    console.log('[Scene Audio] Request:', { 
      projectId, 
      sceneIndex, 
      audioType,
      characterName,
      dialogueIndex,
      lineId,
      lineKind,
      hasText: !!text,
      hasVoiceConfig: !!voiceConfig 
    })

    if (!projectId || sceneIndex === undefined || !text || !voiceConfig) {
      const missingFields = []
      if (!projectId) missingFields.push('projectId')
      if (sceneIndex === undefined) missingFields.push('sceneIndex')
      if (!text) missingFields.push('text')
      if (!voiceConfig) missingFields.push('voiceConfig')
      
      const errorMessage = `Missing required fields: ${missingFields.join(', ')}`
      console.error('[Scene Audio] Error:', errorMessage)
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    // Check for direction-only dialogue (lines that only contain stage directions)
    // These should not have audio generated - they belong in the action field
    if (audioType === 'dialogue') {
      const withoutBrackets = text
        .replace(/\uFF3B/g, '[')
        .replace(/\uFF3D/g, ']')
        .replace(/\[[\s\S]*?\]/g, '')
        .replace(/\([\s\S]*?\)/g, '')
        .trim()
      if (withoutBrackets.length === 0) {
        console.warn(`[Scene Audio] ⚠️ Skipping direction-only dialogue (no spoken content): "${text.substring(0, 100)}"`)
        return NextResponse.json({
          error: 'Direction-only dialogue',
          message: 'This dialogue line contains only stage directions, not spoken content. Stage directions should be in the action field.',
          skipped: true
        }, { status: 400 })
      }
    }

    console.log(`[Scene Audio] Generating ${audioType} for scene ${sceneIndex}`)

    // Use requested language or default to English
    const language = requestedLanguage || 'en'
    let textToGenerate = text
    let adaptationDiagnostics: AdaptationDiagnostics | null = null

    // Translate text if non-English language is requested
    // skipTranslation=true when the client already sent pre-translated text (from stored translations)
    // Uses direct Vertex AI library call (not HTTP fetch) to avoid self-referential URL issues
    if (language !== 'en' && !skipTranslation) {
      try {
        const adaptation = await adaptScriptForTranslationTiming({
          sourceText: textToGenerate,
          targetLanguage: language,
        })
        adaptationDiagnostics = adaptation.diagnostics
        textToGenerate = adaptation.adaptedText
        console.log('[Scene Audio] Pre-translation adaptation:', {
          targetLanguage: language,
          strategy: adaptationDiagnostics.strategy,
          usedFallback: adaptationDiagnostics.usedFallback,
          sourceSyllables: adaptationDiagnostics.sourceSyllables,
          adaptedSyllables: adaptationDiagnostics.adaptedSyllables,
          targetSyllableBudget: adaptationDiagnostics.targetSyllableBudget,
          withinTolerance: adaptationDiagnostics.withinTolerance,
          adaptationError: adaptationDiagnostics.error,
        })

        console.log(`[Scene Audio] Translating text to ${language} via Vertex AI (direct)...`)
        const result = await translateWithVertexAI({
          text: textToGenerate,
          targetLanguage: language,
          sourceLanguage: 'en'
        })
        if (result.translatedText) {
          console.log(`[Scene Audio] Translation successful:`, {
            original: textToGenerate.substring(0, 50),
            translated: result.translatedText.substring(0, 50)
          })
          textToGenerate = result.translatedText
        }
      } catch (translateError: any) {
        // CRITICAL: Do NOT silently fall back to English — log prominently and still attempt TTS
        // The ElevenLabs multilingual models can sometimes handle English text with language hints
        console.error(`[Scene Audio] ⚠️ Translation FAILED for ${language}, TTS will use English text:`, translateError?.message || translateError)
      }
    } else if (language !== 'en' && skipTranslation) {
      console.log(`[Scene Audio] Skipping translation — text already in ${language} (from stored translations)`)
    }

    // Step 2: Optimize text for TTS (remove stage directions, clean up)
    const useGeminiOptimizer =
      voiceConfig.provider === 'google' && voiceConfig.voiceId.startsWith('gemini-')
    const optimized = useGeminiOptimizer
      ? optimizeTextForGeminiTTS(textToGenerate)
      : optimizeTextForTTS(textToGenerate)
      
    console.log('[Scene Audio] Text optimization:', {
      useGeminiOptimizer,
      original: textToGenerate.substring(0, 100),
      optimized: optimized.text.substring(0, 100),
      cues: optimized.cues,
      reduction: `${optimized.originalLength} -> ${optimized.optimizedLength} chars`,
      isSpeakable: optimized.isSpeakable
    })

    // Check if text is speakable (not just stage directions)
    if (!optimized.isSpeakable) {
      console.warn('[Scene Audio] Skipping TTS - not speakable after optimization', {
        language,
        audioType,
        sceneIndex,
        characterName,
        dialogueIndex,
        optimizedLength: optimized.optimizedLength,
        originalLength: optimized.originalLength,
      })
      return NextResponse.json({
        success: false,
        error: 'Text contains only stage directions and cannot be spoken',
        audioUrl: null
      }, { status: 200 }) // Return 200 (success) but indicate no audio was generated
    }

    let finalVoiceConfig = voiceConfig
    let promptSource: ReturnType<typeof resolveCharacterVoicePrompt>['source'] = 'none'

    if (audioType === 'dialogue') {
      const dbCharacter = await findVisionCharacter(projectId, characterId, characterName)
      const resolved = resolveCharacterVoicePrompt(voiceConfig, dbCharacter as {
        voiceConfig?: { prompt?: string }
        voiceDescription?: string
      } | undefined)
      promptSource = resolved.source
      if (resolved.prompt) {
        finalVoiceConfig = { ...voiceConfig, prompt: resolved.prompt }
      }
    }

    // Step 4: Generate audio using specified provider with optimized text
    console.log('[Scene Audio] ==================== TTS INPUT DEBUG ====================')
    console.log('[Scene Audio] Language:', language)
    console.log('[Scene Audio] Provider:', finalVoiceConfig.provider)
    console.log('[Scene Audio] Voice ID:', finalVoiceConfig.voiceId)
    console.log('[Scene Audio] Prompt source:', promptSource)
    console.log('[Scene Audio] Prompt length:', finalVoiceConfig.prompt?.length ?? 0)
    console.log('[Scene Audio] Prompt preview:', finalVoiceConfig.prompt?.slice(0, 80) ?? '(none)')
    console.log('[Scene Audio] Text being sent to TTS:', optimized.text)
    console.log('[Scene Audio] Text length:', optimized.text.length)
    console.log('[Scene Audio] ==================== END TTS INPUT DEBUG ====================')
    
    const characterGender =
      typeof clientCharacterGender === 'string' && clientCharacterGender.trim()
        ? clientCharacterGender.trim()
        : await lookupCharacterGender(projectId, characterId, characterName)
    const characterEdgeVoice =
      clientEdgeVoiceConfig?.voiceId?.trim()
        ? {
            voiceId: clientEdgeVoiceConfig.voiceId.trim(),
            voiceName:
              clientEdgeVoiceConfig.voiceName?.trim() ||
              clientEdgeVoiceConfig.voiceId.trim(),
          }
        : await lookupCharacterEdgeVoice(
            projectId,
            characterId,
            characterName,
            language
          )

    console.log('[Scene Audio] Edge fallback config:', {
      language,
      characterName,
      characterId,
      characterGender: characterGender ?? 'unknown',
      edgeVoiceFromClient: clientEdgeVoiceConfig?.voiceId ?? null,
      edgeVoiceResolved: characterEdgeVoice?.voiceId ?? 'none',
      edgeVoiceName: characterEdgeVoice?.voiceName ?? null,
    })

    const synthesis = await generateAudio(
      optimized.text,
      finalVoiceConfig,
      language,
      audioType,
      optimized.cues,
      characterGender,
      characterEdgeVoice
    )
    const audioBuffer = synthesis.buffer
    const usedProvider = synthesis.provider
    const usedVoiceId = synthesis.voiceId

    // Step 5: Get actual audio duration from buffer
    let audioDuration: number | null = null
    try {
      const wordCount = optimized.text.split(/\s+/).length
      // Pass language for proper buffer-size fallback (critical for Thai/Chinese/Japanese)
      audioDuration = await getAudioDurationFromBuffer(audioBuffer, wordCount, language, usedVoiceId)
      console.log('[Scene Audio] Duration calculated:', audioDuration?.toFixed(2), 'seconds', 'language:', language)
    } catch (error) {
      console.warn('[Scene Audio] Could not get audio duration:', error)
      // Buffer-size fallback (works for ALL languages including Thai)
      // Non-English uses 192kbps (24KB/s), English uses 128kbps (16KB/s)
      const bytesPerSecond = language !== 'en' ? 24000 : 16000
      audioDuration = audioBuffer.length / bytesPerSecond
      console.log('[Scene Audio] Buffer-based fallback duration:', audioDuration?.toFixed(2), 'seconds')
    }

    // Step 6: Upload to Vercel Blob
    const languageSuffix = language !== 'en' ? `-${language}` : ''
    
    // Sanitize character name for URL-safe filenames (replace spaces/special chars with dashes)
    const sanitizeForFilename = (str: string): string => {
      return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }
    
    const fileDescriptor = audioType === 'description'
      ? 'description'
      : audioType === 'narration'
        ? 'narration'
        : sanitizeForFilename(characterName || 'dialogue')

    const fileName = `audio/${audioType}/${projectId}/scene-${sceneIndex}-${fileDescriptor}${languageSuffix}-${Date.now()}.mp3`

    const blob = await put(fileName, audioBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
      addRandomSuffix: false, // Ensures consistent file extension
    })

    console.log(`[Scene Audio] Uploaded to Vercel Blob:`, blob.url)

    // Step 7: Update scene in project metadata with language-specific storage
    if (!skipDbUpdate) {
      await updateSceneAudio(
        projectId, 
        sceneIndex, 
        audioType, 
        blob.url, 
        language,
        audioDuration,
        usedVoiceId,
        characterName,
        dialogueIndex,
        adaptationDiagnostics,
        { lineId, lineKind, characterId },
        usedProvider
      )
    }

    console.log('[Scene Audio] Response payload', {
      success: true,
      audioType,
      language,
      duration: audioDuration,
      characterName,
      dialogueIndex,
      sceneIndex,
      provider: usedProvider,
      voiceId: usedVoiceId,
      fallback: synthesis.fallback ?? false,
    })

    return NextResponse.json({
      success: true,
      audioUrl: blob.url,
      audioType,
      language,
      duration: audioDuration,
      characterName,
      dialogueIndex,
      adaptation: adaptationDiagnostics,
      provider: usedProvider,
      voiceId: usedVoiceId,
      fallback: synthesis.fallback ?? false,
    })
  } catch (error: any) {
    if (error instanceof GoogleTtsBlockedError) {
      return NextResponse.json(
        {
          success: false,
          policyBlocked: true,
          error: error.payload.userMessage,
          code: 'VERTEX_TTS_CONTENT_POLICY',
          tips: error.payload.tips,
          supportCode: error.payload.supportCode ?? null,
          action: error.payload.action,
        },
        { status: 400 }
      )
    }

    if (error instanceof GoogleTtsRateLimitedError) {
      return NextResponse.json(
        {
          success: false,
          rateLimited: true,
          error: error.payload.userMessage,
          code: 'VERTEX_TTS_RATE_LIMIT',
          tips: error.payload.tips,
        },
        { status: 429 }
      )
    }

    // Safely log error details - avoid referencing variables that might not be defined
    console.error('[Scene Audio] Error:', {
      message: error?.message || String(error),
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause,
    })
    
    // Return detailed error for debugging
    const errorMessage = error?.message || 'Audio generation failed'
    const errorDetail = error?.name ? `${error.name}: ${errorMessage}` : errorMessage

    const status =
      typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500

    return NextResponse.json(
      {
        success: false,
        error: errorDetail,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status }
    )
  }
}

type AudioSynthesisResult = {
  buffer: Buffer
  provider: 'google' | 'elevenlabs' | 'edge'
  voiceId: string
  fallback?: boolean
}

async function lookupCharacterGender(
  projectId: string,
  characterId?: string,
  characterName?: string
): Promise<string | undefined> {
  const char = await findVisionCharacter(projectId, characterId, characterName)
  const gender =
    (char as { gender?: string })?.gender ||
    (char as { attributes?: { gender?: string } })?.attributes?.gender
  return typeof gender === 'string' ? gender : undefined
}

async function lookupCharacterEdgeVoice(
  projectId: string,
  characterId?: string,
  characterName?: string,
  language: string = 'en'
): Promise<EdgeVoiceConfig | undefined> {
  const char = await findVisionCharacter(projectId, characterId, characterName)
  return getEdgeVoiceConfigForResolution(
    char as {
      edgeVoiceConfigByLang?: Record<string, EdgeVoiceConfig>
      edgeVoiceConfig?: EdgeVoiceConfig
    },
    language
  )
}

async function findVisionCharacter(
  projectId: string,
  characterId?: string,
  characterName?: string
): Promise<Record<string, unknown> | undefined> {
  try {
    await sequelize.authenticate()
    const project = await Project.findByPk(projectId)
    const characters = project?.metadata?.visionPhase?.characters
    if (!Array.isArray(characters)) return undefined

    const char = matchCharacterRecord(characters, { characterId, characterName })
    return char as Record<string, unknown> | undefined
  } catch {
    return undefined
  }
}

async function generateAudio(
  text: string,
  voiceConfig: VoiceConfig,
  language: string = 'en',
  audioType: AudioGenerationRequest['audioType'] = 'narration',
  deliveryCues: string[] = [],
  characterGender?: string,
  characterEdgeVoice?: EdgeVoiceConfig
): Promise<AudioSynthesisResult> {
  const primaryProvider: 'google' | 'elevenlabs' =
    voiceConfig.provider === 'elevenlabs' ? 'elevenlabs' : 'google'

  try {
    const buffer =
      voiceConfig.provider === 'elevenlabs'
        ? await generateElevenLabsAudio(text, voiceConfig)
        : await generateGoogleAudio(text, voiceConfig, language, audioType, deliveryCues)
    return {
      buffer,
      provider: primaryProvider,
      voiceId: voiceConfig.voiceId,
    }
  } catch (err) {
    if (!isEdgeTtsFallbackEnabled() || !isQuotaOrRateLimitError(err)) {
      throw err
    }
    const edgeVoice = resolveEdgeVoiceForCharacter({
      edgeVoiceConfig: characterEdgeVoice,
      gender: characterGender,
      lang: language,
    })
    const storedVoiceId = characterEdgeVoice?.voiceId?.trim()
    if (
      storedVoiceId &&
      getEdgeVoiceLanguageFromId(storedVoiceId) !==
        (language || 'en').trim().toLowerCase().split('-')[0]
    ) {
      console.warn(
        `[Scene Audio] Edge voice locale mismatch: stored ${storedVoiceId} for lang ${language}, using ${edgeVoice}`
      )
    }
    console.warn(
      `[Scene Audio] Paid TTS failed (${primaryProvider}), falling back to Edge voice ${edgeVoice} (stored=${characterEdgeVoice?.voiceId ?? 'none'}, gender=${characterGender ?? 'unknown'}, lang=${language}):`,
      err instanceof Error ? err.message : err
    )
    const buffer = await synthesizeEdgeMp3({ text, voice: edgeVoice, language })
    return {
      buffer,
      provider: 'edge',
      voiceId: edgeVoice,
      fallback: true,
    }
  }
}

async function generateElevenLabsAudio(text: string, voiceConfig: VoiceConfig): Promise<Buffer> {
  const sanitizedText = finalizeTextForGoogleTts(text)
  if (!sanitizedText.trim()) {
    throw new Error('Text is empty after removing bracketed tags')
  }
  return synthesizeElevenLabsMp3({
    text: sanitizedText,
    voiceId: voiceConfig.voiceId,
    stability: voiceConfig.stability,
    similarityBoost: voiceConfig.similarityBoost,
  })
}

/**
 * Default Google TTS voice for each supported locale. Used when the user's
 * configured voice (e.g. `en-US-Studio-M`) is locked to a specific locale
 * but the requested generation language is different (e.g. Thai). Picking
 * Neural2 where Google offers it, falling back to Standard otherwise. The
 * goal is just "sounds reasonable in the target language" — voice timbre
 * cannot be preserved across locales because Studio/WaveNet/Neural2 voices
 * are locale-specific.
 */
const DEFAULT_GOOGLE_VOICE_BY_LOCALE: Record<string, string> = {
  'en-US': 'en-US-Neural2-D',
  'en-GB': 'en-GB-Neural2-B',
  'th-TH': 'th-TH-Neural2-C',
  'es-ES': 'es-ES-Neural2-B',
  'es-US': 'es-US-Neural2-B',
  'fr-FR': 'fr-FR-Neural2-D',
  'fr-CA': 'fr-CA-Neural1-D',
  'de-DE': 'de-DE-Neural2-D',
  'it-IT': 'it-IT-Neural2-C',
  'ja-JP': 'ja-JP-Neural2-C',
  'ko-KR': 'ko-KR-Neural2-C',
  'cmn-CN': 'cmn-CN-Standard-B',
  'cmn-TW': 'cmn-TW-Standard-B',
  'pt-BR': 'pt-BR-Neural2-B',
  'pt-PT': 'pt-PT-Wavenet-B',
  'ru-RU': 'ru-RU-Standard-D',
  'nl-NL': 'nl-NL-Standard-B',
  'pl-PL': 'pl-PL-Standard-C',
  'tr-TR': 'tr-TR-Standard-D',
  'sv-SE': 'sv-SE-Standard-D',
  'da-DK': 'da-DK-Standard-C',
  'nb-NO': 'nb-NO-Standard-D',
  'fi-FI': 'fi-FI-Standard-A',
  'hi-IN': 'hi-IN-Neural2-D',
  'id-ID': 'id-ID-Standard-A',
  'vi-VN': 'vi-VN-Standard-D',
  'cy-GB': 'cy-GB-Standard-A',
  'cs-CZ': 'cs-CZ-Standard-A',
  'el-GR': 'el-GR-Standard-A',
  'he-IL': 'he-IL-Standard-A',
  'hu-HU': 'hu-HU-Standard-A',
  'ro-RO': 'ro-RO-Standard-A',
  'sk-SK': 'sk-SK-Standard-A',
  'uk-UA': 'uk-UA-Standard-A',
  'ar-XA': 'ar-XA-Standard-D',
}

/**
 * A voice is "multilingual" if it can render any languageCode without a
 * 400 from Google. Today that includes Gemini TTS and Chirp3 voices, plus
 * voice clones (which carry their own model). For everything else (Studio,
 * WaveNet, Neural2, Standard) we have to swap to a locale-appropriate
 * default voice when the request language doesn't match the voice locale.
 */
function isMultilingualVoiceName(name: string): boolean {
  if (!name) return false
  // Chirp3 voices look like `en-US-Chirp3-HD-Aoede`, etc.
  if (/-Chirp3?[-_]/i.test(name)) return true
  if (/-Chirp\b/i.test(name)) return true
  return false
}

function extractLocaleFromVoiceName(name: string): string | null {
  if (!name) return null
  const parts = name.split('-')
  if (parts.length < 2) return null
  // Locales are first two segments: `en-US-Studio-M` -> `en-US`,
  // `cmn-CN-Standard-B` -> `cmn-CN`.
  return `${parts[0]}-${parts[1]}`
}

async function generateGoogleAudio(
  text: string,
  voiceConfig: VoiceConfig,
  language: string = 'en',
  audioType: AudioGenerationRequest['audioType'] = 'narration',
  deliveryCues: string[] = []
): Promise<Buffer> {
  if (voiceConfig.provider !== 'google') {
    throw new Error('Internal error: Google TTS invoked for non-google voice config')
  }
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  let accessToken: string | null = null

  const isGemini = voiceConfig.voiceId.startsWith('gemini-')
  const isCustomClone = !isGemini && !voiceConfig.voiceId.includes('-') && voiceConfig.voiceId.length > 20
  
  // Final sanitize: multiline/unicode brackets, markdown emphasis, echoed tail (see textOptimizer).
  // Use the appropriate finalizer based on the model
  const sanitizedText = isGemini 
    ? finalizeTextForGeminiTts(text)
    : finalizeTextForGoogleTts(text)
  
  if (!sanitizedText) {
    throw new Error('Text is empty after removing bracketed tags')
  }

  try {
    // Try to get the GCP token (Vertex AI / standard Google service account auth)
    accessToken = await getVertexAIAuthToken()
    console.log('[Google TTS] Using Vertex AI service account token')
  } catch (authErr) {
    console.log('[Google TTS] No service account token available, falling back to API key:', authErr)
  }

  if (!accessToken && !apiKey) throw new Error('Google API key or service account not configured')
  
  const actualVoiceName = isGemini ? voiceConfig.voiceId.replace('gemini-', '') : voiceConfig.voiceId
  
  let languageCode = actualVoiceName.split('-').length >= 2 && !isGemini && !isCustomClone
    ? actualVoiceName.split('-').slice(0, 2).join('-') 
    : (voiceConfig.languageCode || 'en-US')

  // Override with the requested target language to ensure native accents
  if (language && language !== 'en') {
    const preciseMap: Record<string, string> = {
      'th': 'th-TH', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'it': 'it-IT',
      'ja': 'ja-JP', 'ko': 'ko-KR', 'zh': 'cmn-CN', 'pt': 'pt-BR', 'ru': 'ru-RU',
      'nl': 'nl-NL', 'pl': 'pl-PL', 'sv': 'sv-SE', 'tr': 'tr-TR', 'da': 'da-DK',
      'fi': 'fi-FI', 'no': 'nb-NO', 'hi': 'hi-IN', 'id': 'id-ID', 'vi': 'vi-VN',
      'cy': 'cy-GB', 'et': 'et-EE', 'hr': 'hr-HR', 'bs': 'bs-BA', 'sl': 'sl-SI',
      'mk': 'mk-MK', 'ka': 'ka-GE', 'az': 'az-AZ', 'kk': 'kk-KZ', 'fa': 'fa-IR',
      'ur': 'ur-PK', 'sw': 'sw-KE'
    }
    
    languageCode = preciseMap[language] || `${language}-${language.toUpperCase()}`
    console.log(`[Google TTS] Target language ${language} requested. Setting languageCode to ${languageCode} to enforce native accent.`)
  }

  // Voice substitution for cross-locale generation. Studio/WaveNet/Neural2/
  // Standard voices are locked to a single locale, so calling Google TTS
  // with mismatched voice.name + languageCode 400s ("voice 'en-US-Studio-M'
  // doesn't match language code 'th-TH'"). Gemini TTS, Chirp3, and voice
  // clones are multilingual and can stay as-is. For everything else, if the
  // voice's locale doesn't match the requested languageCode we swap to a
  // locale-appropriate default so the user still gets correctly-pronounced
  // audio in the target language even if voice timbre is lost.
  let voiceNameToSend = actualVoiceName
  let voiceWasSubstituted = false
  if (!isGemini && !isCustomClone) {
    const voiceLocale = extractLocaleFromVoiceName(actualVoiceName)
    const localeMatches = voiceLocale && voiceLocale.toLowerCase() === languageCode.toLowerCase()
    if (!localeMatches && !isMultilingualVoiceName(actualVoiceName)) {
      const fallback = DEFAULT_GOOGLE_VOICE_BY_LOCALE[languageCode]
      if (fallback) {
        console.warn(
          `[Google TTS] Voice '${actualVoiceName}' (${voiceLocale ?? 'unknown'}) does not support languageCode '${languageCode}'. ` +
            `Substituting default voice '${fallback}' for this run.`
        )
        voiceNameToSend = fallback
        voiceWasSubstituted = true
      } else {
        // No mapping — drop voice.name and let Google pick a default. We set
        // ssmlGender NEUTRAL on the payload below so the API doesn't 400.
        console.warn(
          `[Google TTS] Voice '${actualVoiceName}' (${voiceLocale ?? 'unknown'}) does not support languageCode '${languageCode}' and no default mapping is available. Dropping voice.name; Google will pick a default voice.`
        )
        voiceNameToSend = ''
        voiceWasSubstituted = true
      }
    }
  }

  const payload: any = {
    input: { text: sanitizedText },
    voice: {
      languageCode,
    },
    audioConfig: {
      audioEncoding: 'MP3',
    },
  }

  if (isCustomClone) {
    payload.voice.voiceClone = {
      voiceCloningKey: actualVoiceName
    }
  } else if (voiceNameToSend) {
    payload.voice.name = voiceNameToSend
  } else {
    // Fallback path: no voice name available for the locale. Google requires
    // either name or ssmlGender; NEUTRAL is widely supported.
    payload.voice.ssmlGender = 'NEUTRAL'
  }

  if (isGemini) {
    // Default aligns with Gemini 3.1 Flash TTS preview (global). Override via GEMINI_TTS_MODEL,
    // e.g. gemini-2.5-flash-tts or gemini-2.5-pro-tts for GA regions / quality tradeoffs.
    payload.voice.modelName =
      process.env.GEMINI_TTS_MODEL?.trim() || 'gemini-3.1-flash-tts-preview'
    const advancedVoiceOptions = buildGeminiTtsAdvancedVoiceOptions()
    if (advancedVoiceOptions) {
      payload.advancedVoiceOptions = advancedVoiceOptions
    }
  }

  const geminiAudioType = audioType === 'description' ? 'narration' : audioType

  // Use v1beta1 for Gemini TTS and Voice Cloning
  const apiVersion = (isGemini || isCustomClone) ? 'v1beta1' : 'v1'
  let url = `https://texttospeech.googleapis.com/${apiVersion}/text:synthesize`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  } else if (apiKey) {
    url += `?key=${apiKey}`
  }

  const max429Retries = getGoogleTts429MaxRetries()
  const maxPolicyRetries = getGoogleTtsPolicyMaxRetries()
  let response: Response | null = null
  let lastErrorText = ''
  let lastStatus = 0
  let attempt429 = 0
  let policyAttempt = 0

  while (true) {
    if (isGemini) {
      const promptLevel = Math.min(policyAttempt, 2) as 0 | 1 | 2
      payload.input.prompt = buildGeminiTtsPrompt({
        audioType: geminiAudioType,
        voicePrompt: voiceConfig.prompt,
        deliveryCues,
        promptLevel,
      })
    }

    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      break
    }

    lastStatus = response.status
    lastErrorText = await response.text()
    console.error(`[Google TTS] API error (${response.status}):`, lastErrorText)

    const violation = parseVertexTtsPolicyViolation(response.status, lastErrorText, audioType)
    if (violation) {
      if (policyAttempt < maxPolicyRetries) {
        const delayMs = backoffMsForPolicyAttempt(policyAttempt)
        const nextPromptLevel = Math.min(policyAttempt + 1, 2)
        console.warn(
          `[Google TTS] Policy block — retry ${policyAttempt + 1}/${maxPolicyRetries} ` +
            `with prompt level ${nextPromptLevel} after ${delayMs}ms`
        )
        policyAttempt++
        await sleep(delayMs)
        continue
      }
      console.warn('[Google TTS] Vertex usage-guidelines block — returning user-facing guidance')
      throw new GoogleTtsBlockedError(violation)
    }

    const is429 = response.status === 429
    const ratePayload = parseVertexTtsRateLimit(response.status, lastErrorText)
    if (is429 && attempt429 < max429Retries) {
      const delayMs = backoffMsFor429Attempt(attempt429, response.headers.get('retry-after'))
      console.warn(
        `[Google TTS] Rate limited (429), retry ${attempt429 + 1}/${max429Retries} after ${delayMs}ms`
      )
      attempt429++
      await sleep(delayMs)
      continue
    }

    if (is429 && ratePayload) {
      throw new GoogleTtsRateLimitedError(ratePayload)
    }

    throw new Error(`Google TTS API error: ${response.status} - ${lastErrorText}`)
  }

  if (!response?.ok) {
    throw new Error(`Google TTS API error: ${lastStatus} - ${lastErrorText}`)
  }

  const data = await response.json()
  return Buffer.from(data.audioContent, 'base64')
}

async function updateSceneAudio(
  projectId: string,
  sceneIndex: number,
  audioType: 'narration' | 'dialogue' | 'description',
  audioUrl: string,
  language: string = 'en',
  duration?: number | null,
  voiceId?: string,
  characterName?: string,
  dialogueIndex?: number,
  adaptation?: AdaptationDiagnostics | null,
  lineMeta?: {
    lineId?: string
    lineKind?: 'narration' | 'dialogue'
    characterId?: string
  },
  provider?: string
) {
  console.log('[Update Scene Audio] Persisting via locked atomic writer:', {
    projectId,
    sceneIndex,
    audioType,
    language,
    dialogueIndex,
    characterName,
  })

  const { oldAudioUrl } = await persistSceneAudioAtomic({
    projectId,
    sceneIndex,
    audioType,
    audioUrl,
    language,
    duration,
    voiceId,
    characterName,
    dialogueIndex,
    adaptation,
    lineMeta,
    provider,
    updateScriptUpdatedAt: true,
  })

  console.log('[Update Scene Audio] Project updated successfully for language:', language)
  
  // Delete old audio blob asynchronously after successful regeneration
  // Fire-and-forget pattern: don't block response, don't fail on error
  // The UI has already been updated with the new URL, so 404 on old URL is expected
  if (oldAudioUrl && oldAudioUrl !== audioUrl) {
    console.log('[Update Scene Audio] Queuing async deletion of old audio:', oldAudioUrl)
    
    // Use setTimeout to ensure this runs after response is sent
    setTimeout(async () => {
      try {
        const url = oldAudioUrl
        const isVercelBlob =
          url.includes('.vercel-storage.com') ||
          url.includes('.public.blob.vercel-storage.com')

        if (isVercelBlob) {
          await del([url])
          console.log('[Update Scene Audio] Old audio blob deleted successfully:', url)
          return
        }

        const base =
          process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
        if (!base) {
          console.warn(
            '[Update Scene Audio] Skipping remote blob delete (no base URL); URL:',
            url.slice(0, 80)
          )
          return
        }

        const deleteResponse = await fetch(`${base}/api/blobs/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [url] }),
        })
        if (deleteResponse.ok) {
          console.log('[Update Scene Audio] Old audio deleted via API:', url)
        } else {
          console.warn('[Update Scene Audio] Failed to delete old audio:', url, deleteResponse.status)
        }
      } catch (error) {
        // Ignore errors - orphaned blobs will be cleaned up by scheduled job
        console.warn('[Update Scene Audio] Error deleting old audio blob (will be cleaned up later):', error)
      }
    }, 100)
  }
}