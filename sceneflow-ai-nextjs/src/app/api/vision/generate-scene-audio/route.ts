import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { optimizeTextForTTS } from '../../../../lib/tts/textOptimizer'
import { getAudioDurationFromBuffer } from '../../../../lib/audio/serverAudioDuration'
import { getElevenLabsVoiceForLanguage } from '../../../../lib/audio/elevenlabsVoices'
import { translateWithVertexAI } from '../../../../lib/vertexai/translate'
import { getVertexAIAuthToken } from '../../../../lib/vertexai/client'

export const maxDuration = 60
export const runtime = 'nodejs'

interface VoiceConfig {
  provider: 'elevenlabs' | 'google'
  voiceId: string
  voiceName: string
  stability?: number
  similarityBoost?: number
  languageCode?: string
  prompt?: string
}

interface AudioGenerationRequest {
  projectId: string
  sceneIndex: number
  audioType: 'narration' | 'dialogue'
  text: string
  voiceConfig: VoiceConfig
  characterName?: string // For dialogue
  dialogueIndex?: number // For dialogue - index of the dialog line in the scene
  language?: string // Target language for TTS (default: 'en')
  skipTranslation?: boolean // Skip server-side translation (text is already translated)
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, sceneIndex, audioType, text, voiceConfig, characterName, dialogueIndex, language: requestedLanguage, skipTranslation }: AudioGenerationRequest & { text: string } = await req.json()

    // Log the request for debugging
    console.log('[Scene Audio] Request:', { 
      projectId, 
      sceneIndex, 
      audioType,
      characterName,
      dialogueIndex,
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
      const withoutBrackets = text.replace(/\[[^\]]*\]/g, '').trim()
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

    // Translate text if non-English language is requested
    // skipTranslation=true when the client already sent pre-translated text (from stored translations)
    // Uses direct Vertex AI library call (not HTTP fetch) to avoid self-referential URL issues
    if (language !== 'en' && !skipTranslation) {
      try {
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
    const optimized = optimizeTextForTTS(textToGenerate)
    console.log('[Scene Audio] Text optimization:', {
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

    // Step 3: Select appropriate voice for language (if using ElevenLabs)
    let finalVoiceConfig = { ...voiceConfig }
    if (voiceConfig.provider === 'elevenlabs') {
      const languageVoice = getElevenLabsVoiceForLanguage(language, voiceConfig.voiceId)
      finalVoiceConfig = {
        ...voiceConfig,
        voiceId: languageVoice.voiceId
      }
      console.log('[Scene Audio] Using ElevenLabs voice for language:', language, languageVoice.voiceName)
    }

    // Step 4: Generate audio using specified provider with optimized text
    console.log('[Scene Audio] ==================== TTS INPUT DEBUG ====================')
    console.log('[Scene Audio] Language:', language)
    console.log('[Scene Audio] Provider:', finalVoiceConfig.provider)
    console.log('[Scene Audio] Voice ID:', finalVoiceConfig.voiceId)
    console.log('[Scene Audio] Text being sent to TTS:', optimized.text)
    console.log('[Scene Audio] Text length:', optimized.text.length)
    console.log('[Scene Audio] ==================== END TTS INPUT DEBUG ====================')
    
    const audioBuffer = await generateAudio(optimized.text, finalVoiceConfig, language)

    // Step 5: Get actual audio duration from buffer
    let audioDuration: number | null = null
    try {
      const wordCount = optimized.text.split(/\s+/).length
      // Pass language for proper buffer-size fallback (critical for Thai/Chinese/Japanese)
      audioDuration = await getAudioDurationFromBuffer(audioBuffer, wordCount, language)
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
    await updateSceneAudio(
      projectId, 
      sceneIndex, 
      audioType, 
      blob.url, 
      language,
      audioDuration,
      finalVoiceConfig.voiceId,
      characterName, 
      dialogueIndex
    )

    console.log('[Scene Audio] Response payload', {
      success: true,
      audioType,
      language,
      duration: audioDuration,
      characterName,
      dialogueIndex,
      sceneIndex,
    })

    return NextResponse.json({
      success: true,
      audioUrl: blob.url,
      audioType,
      language,
      duration: audioDuration,
      characterName,
      dialogueIndex
    })
  } catch (error: any) {
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
    
    return NextResponse.json(
      { 
        error: errorDetail,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined 
      },
      { status: 500 }
    )
  }
}

async function generateAudio(text: string, voiceConfig: VoiceConfig, language: string = 'en'): Promise<Buffer> {
  if (voiceConfig.provider === 'elevenlabs') {
    return await generateElevenLabsAudio(text, voiceConfig, language)
  } else {
    return await generateGoogleAudio(text, voiceConfig, language)
  }
}

async function generateElevenLabsAudio(text: string, voiceConfig: VoiceConfig, language: string = 'en'): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error('ElevenLabs API key not configured')

  // Check if text contains bracketed audio tags (ElevenLabs v3 format)
  // v3 models support [instruction] bracket syntax for audio tags
  const hasAudioTags = /\[[^\]]+\]/.test(text)

  console.log('[Scene Audio] Audio tags detected:', hasAudioTags, 'Text:', text.substring(0, 100), 'Language:', language)

  // Use higher quality format for non-English languages to avoid stuttering/quality issues
  // MP3 44.1kHz 192kbps provides better quality for complex languages like Thai
  // For English, we can use 128kbps to save bandwidth
  const outputFormat = language !== 'en' ? 'mp3_44100_192' : 'mp3_44100_128'

  // Model selection strategy:
  // - eleven_v3: Flagship model, best quality, 73 languages, 5k char limit
  // - eleven_flash_v2_5: Ultra-fast fallback (~75ms), 32 languages, 40k char limit
  // Default: v3 for all languages (best quality). Override with ELEVENLABS_MODEL_ID env var.
  const useV3Model = !process.env.ELEVENLABS_MODEL_ID || process.env.ELEVENLABS_MODEL_ID === 'eleven_v3'
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_v3'
  
  // Build URL - eleven_v3 does NOT support optimize_streaming_latency parameter
  // Only add it for non-v3 models
  const urlParams = new URLSearchParams({ output_format: outputFormat })
  if (modelId !== 'eleven_v3') {
    urlParams.append('optimize_streaming_latency', '0')
  }
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}?${urlParams.toString()}`
  
  console.log('[Scene Audio] Model selection:', {
    language,
    useV3Model,
    selectedModel: modelId,
  })

  // Build voice_settings based on model
  // eleven_v3 uses different settings than turbo_v2_5:
  // - v3: stability must be 0.0 (Creative), 0.5 (Natural), or 1.0 (Robust)
  // - v3: does NOT support similarity_boost, style, or use_speaker_boost
  // - turbo: supports stability (0-1), similarity_boost (0-1), style (0-1), use_speaker_boost
  
  let voiceSettings: Record<string, any>
  
  if (modelId === 'eleven_v3') {
    // v3 model - simpler settings
    // Use 0.5 (Natural) for balanced quality, or 1.0 (Robust) for more consistent output
    voiceSettings = {
      stability: 0.5, // Natural - best balance for most content
    }
  } else {
    // turbo_v2_5 and other models - full settings
    const isNonEnglish = language !== 'en'
    const defaultStability = isNonEnglish ? 0.6 : 0.5
    const defaultSimilarityBoost = isNonEnglish ? 0.8 : 0.75
    
    voiceSettings = {
      stability: voiceConfig.stability || defaultStability,
      similarity_boost: voiceConfig.similarityBoost || defaultSimilarityBoost,
      style: hasAudioTags ? 0.5 : undefined,
      use_speaker_boost: hasAudioTags ? true : (isNonEnglish ? true : undefined),
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: text,
      model_id: modelId,
      voice_settings: voiceSettings,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    console.error('[Scene Audio] ElevenLabs API failed:', response.status, errorText, 'Language:', language, 'Format:', outputFormat, 'Model:', modelId)
    throw new Error(`ElevenLabs API error: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  // Log audio generation details for debugging
  console.log('[Scene Audio] ElevenLabs audio generated', {
    bytes: buffer.length,
    format: outputFormat,
    language,
    model: modelId,
  })
  
  // Validate audio buffer is not empty
  if (buffer.length === 0) {
    throw new Error('Generated audio buffer is empty')
  }
  
  return buffer
}

async function generateGoogleAudio(text: string, voiceConfig: VoiceConfig, language: string = 'en'): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  let accessToken: string | null = null

  // Gemini TTS doesn't natively support bracketed emotion tags like ElevenLabs.
  // Remove them to prevent hallucinations where it reads them aloud or stutters.
  // Also remove asterisks (*) used for markdown emphasis, as Gemini sometimes reads the word "asterisk" aloud.
  const sanitizedText = text.replace(/\[.*?\]/g, '').replace(/\*/g, '').trim()
  
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

  const isGemini = voiceConfig.voiceId.startsWith('gemini-')
  const isCustomClone = !isGemini && !voiceConfig.voiceId.includes('-') && voiceConfig.voiceId.length > 20
  
  const actualVoiceName = isGemini ? voiceConfig.voiceId.replace('gemini-', '') : voiceConfig.voiceId
  
  let languageCode = actualVoiceName.split('-').length >= 2 && !isGemini && !isCustomClone
    ? actualVoiceName.split('-').slice(0, 2).join('-') 
    : (voiceConfig.languageCode || 'en-US')

  // Override with the requested target language to ensure native accents
  if (language && language !== 'en') {
    // Map 2-letter codes to standard Google TTS locales
    const localeMap: Record<string, string> = {
      'th': 'th-TH',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'zh': 'cmn-CN',
      'pt': 'pt-BR',
      'ru': 'ru-RU',
      'nl': 'nl-NL',
      'pl': 'nl-NL', // Wait, nl-NL for pl? Let's fix that
      'sv': 'sv-NL', // Wait...
    }
    
    // Better locale map fallback logic
    const preciseMap: Record<string, string> = {
      'th': 'th-TH', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'it': 'it-IT',
      'ja': 'ja-JP', 'ko': 'ko-KR', 'zh': 'cmn-CN', 'pt': 'pt-BR', 'ru': 'ru-RU',
      'nl': 'nl-NL', 'pl': 'pl-PL', 'sv': 'sv-SE', 'tr': 'tr-TR', 'da': 'da-DK',
      'fi': 'da-DK', 'no': 'nb-NO', 'hi': 'hi-IN', 'id': 'id-ID', 'vi': 'id-ID',
      'cy': 'cy-GB', 'et': 'et-EE', 'hr': 'hr-HR', 'bs': 'bs-BA', 'sl': 'sl-SI', 'mk': 'mk-MK', 'ka': 'ka-GE', 'az': 'az-AZ', 'kk': 'kk-KZ', 'fa': 'fa-IR', 'ur': 'ur-PK', 'sw': 'sw-KE'
    }
    
    languageCode = preciseMap[language] || `${language}-${language.toUpperCase()}`
    console.log(`[Google TTS] Target language ${language} requested. Setting languageCode to ${languageCode} to enforce native accent.`)
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
  } else {
    payload.voice.name = actualVoiceName
  }

  if (isGemini) {
    payload.voice.modelName = 'gemini-2.5-flash-tts'
    if (voiceConfig.prompt) {
      // Gemini TTS sometimes reads the prompt aloud if it's too descriptive.
      // We prepend a strict instruction to prevent this.
      payload.input.prompt = `INSTRUCTION: You are a voice actor. Do not read this instruction aloud. Adopt the following voice profile precisely: ${voiceConfig.prompt}`
    }
  }

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

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[Google TTS] API error (${response.status}):`, errorText)
    throw new Error(`Google TTS API error: ${response.status} - ${errorText}`)
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
  dialogueIndex?: number
) {
  await sequelize.authenticate()
  const project = await Project.findByPk(projectId)
  if (!project) throw new Error('Project not found')

  const metadata = project.metadata || {}
  const visionPhase = metadata.visionPhase || {}
  
  // FIX: Check where scenes actually live
  const script = visionPhase.script || {}
  const existingScenes = script.script?.scenes || script.scenes || []
  
  console.log('[Update Scene Audio] Current structure:', {
    hasScriptScript: !!script.script,
    hasScriptScenes: !!script.scenes,
    hasScriptScriptScenes: !!script.script?.scenes,
    sceneCount: existingScenes.length,
    language
  })

  // Find old audio URL to delete after successful update
  let oldAudioUrl: string | null = null
  const currentScene = existingScenes[sceneIndex]
  if (currentScene) {
    if (audioType === 'narration') {
      oldAudioUrl = currentScene.narrationAudio?.[language]?.url || 
                    (language === 'en' ? currentScene.narrationAudioUrl : null)
    } else if (audioType === 'description') {
      oldAudioUrl = currentScene.descriptionAudio?.[language]?.url ||
                    (language === 'en' ? currentScene.descriptionAudioUrl : null)
    } else if (audioType === 'dialogue' && dialogueIndex !== undefined) {
      const dialogueArray = currentScene.dialogueAudio?.[language] || []
      const existingEntry = dialogueArray.find((d: any) => d.dialogueIndex === dialogueIndex)
      oldAudioUrl = existingEntry?.audioUrl || null
    }
  }

  // Update the specific scene
  const updatedScenes = existingScenes.map((s: any, idx: number) => {
    if (idx !== sceneIndex) return s

    const scene = { ...s }

    if (audioType === 'narration') {
      // Initialize narrationAudio if it doesn't exist
      if (!scene.narrationAudio) {
        scene.narrationAudio = {}
      }
      
      // Store language-specific narration audio
      scene.narrationAudio[language] = {
        url: audioUrl,
        duration: duration || undefined,
        generatedAt: new Date().toISOString(),
        voiceId: voiceId || undefined
      }
      
      // Maintain backward compatibility: set narrationAudioUrl for English
      if (language === 'en') {
        scene.narrationAudioUrl = audioUrl
        scene.narrationAudioGeneratedAt = new Date().toISOString()
      }
      
      return scene
    } else if (audioType === 'description') {
      if (!scene.descriptionAudio) {
        scene.descriptionAudio = {}
      }

      scene.descriptionAudio[language] = {
        url: audioUrl,
        duration: duration || undefined,
        generatedAt: new Date().toISOString(),
        voiceId: voiceId || undefined,
      }

      if (language === 'en') {
        scene.descriptionAudioUrl = audioUrl
        scene.descriptionAudioGeneratedAt = new Date().toISOString()
      }

      return scene
    } else {
      // Dialogue audio - initialize dialogueAudio object if needed
      if (!scene.dialogueAudio || Array.isArray(scene.dialogueAudio)) {
        // Migrate old array format if exists
        if (Array.isArray(scene.dialogueAudio) && scene.dialogueAudio.length > 0) {
          scene.dialogueAudio = { en: scene.dialogueAudio }
        } else {
          scene.dialogueAudio = {}
        }
      }
      
      // Initialize language array if it doesn't exist
      if (!scene.dialogueAudio[language]) {
        scene.dialogueAudio[language] = []
      }
      
      const dialogueArray = [...scene.dialogueAudio[language]]
      
      // Find existing entry by dialogueIndex (primary match) or character+index combo
      // This handles cases where old entries might have mismatched data
      let existingIndex = dialogueArray.findIndex((d: any) => 
        d.dialogueIndex === dialogueIndex
      )
      
      // If not found by dialogueIndex alone, try character + dialogueIndex
      if (existingIndex < 0) {
        existingIndex = dialogueArray.findIndex((d: any) => 
          d.character?.toLowerCase() === characterName?.toLowerCase() && 
          d.dialogueIndex === dialogueIndex
        )
      }
      
      const dialogueEntry = {
        character: characterName!,
        dialogueIndex: dialogueIndex!,
        audioUrl,
        duration: duration || undefined,
        voiceId: voiceId || undefined
      }
      
      if (existingIndex >= 0) {
        dialogueArray[existingIndex] = dialogueEntry
      } else {
        dialogueArray.push(dialogueEntry)
      }
      
      // CRITICAL: Deduplicate - remove any other entries with the same dialogueIndex
      // This cleans up any duplicate entries from previous bugs
      const deduplicatedArray = dialogueArray.filter((d: any, idx: number, arr: any[]) => {
        if (d.dialogueIndex === dialogueIndex) {
          // For entries with this dialogueIndex, only keep the one we just set/updated
          const lastIdx = arr.findLastIndex((x: any) => x.dialogueIndex === dialogueIndex)
          return idx === lastIdx
        }
        return true
      })
      
      scene.dialogueAudio[language] = deduplicatedArray
      
      // Maintain backward compatibility: set legacy dialogueAudio array for English ONLY if object structure doesn't exist
      // DO NOT overwrite the object structure - this would delete other languages!
      // The object structure { en: [...], th: [...], es: [...] } must be preserved
      scene.dialogueAudioGeneratedAt = new Date().toISOString()
      
      return scene
    }
  })

  // FIX: Preserve the existing structure (don't create double nesting)
  const updatedScript = script.script?.scenes
    ? { ...script, script: { ...script.script, scenes: updatedScenes } }  // Preserve script.script.scenes
    : { ...script, scenes: updatedScenes }  // Use script.scenes

  console.log('[Update Scene Audio] Updating with structure:', {
    hasScriptScript: !!updatedScript.script,
    hasScriptScenes: !!updatedScript.scenes,
    language
  })

  // Update metadata
  await project.update({
    metadata: {
      ...metadata,
      visionPhase: {
        ...visionPhase,
        script: updatedScript,
      },
    },
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
        const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/blobs/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [oldAudioUrl] }),
        })
        if (deleteResponse.ok) {
          console.log('[Update Scene Audio] Old audio blob deleted successfully:', oldAudioUrl)
        } else {
          console.warn('[Update Scene Audio] Failed to delete old audio blob:', oldAudioUrl, deleteResponse.status)
        }
      } catch (error) {
        // Ignore errors - orphaned blobs will be cleaned up by scheduled job
        console.warn('[Update Scene Audio] Error deleting old audio blob (will be cleaned up later):', error)
      }
    }, 100)
  }
}