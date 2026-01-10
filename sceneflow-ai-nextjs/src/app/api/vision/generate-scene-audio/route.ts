import { NextRequest, NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { optimizeTextForTTS } from '../../../../lib/tts/textOptimizer'
import { getAudioDurationFromBuffer } from '../../../../lib/audio/serverAudioDuration'
import { getElevenLabsVoiceForLanguage } from '../../../../lib/audio/elevenlabsVoices'

export const maxDuration = 60
export const runtime = 'nodejs'

interface VoiceConfig {
  provider: 'elevenlabs' | 'google'
  voiceId: string
  voiceName: string
  stability?: number
  similarityBoost?: number
  languageCode?: string
}

interface AudioGenerationRequest {
  projectId: string
  sceneIndex: number
  audioType: 'narration' | 'dialogue'
  text: string
  voiceConfig: VoiceConfig
  characterName?: string // For dialogue
  dialogueIndex?: number // For dialogue - index of the dialog line in the scene
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, sceneIndex, audioType, text, voiceConfig, characterName, dialogueIndex }: AudioGenerationRequest & { text: string } = await req.json()

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

    // Text is always in English - no translation needed
    const language = 'en'
    let textToGenerate = text

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
      audioDuration = await getAudioDurationFromBuffer(audioBuffer, wordCount)
      console.log('[Scene Audio] Actual duration:', audioDuration, 'seconds')
    } catch (error) {
      console.warn('[Scene Audio] Could not get audio duration:', error)
      // Fallback to estimation
      const wordCount = optimized.text.split(/\s+/).length
      audioDuration = (wordCount / 150) * 60
    }

    // Step 6: Upload to Vercel Blob
    const languageSuffix = language !== 'en' ? `-${language}` : ''
    const fileDescriptor = audioType === 'description'
      ? 'description'
      : audioType === 'narration'
        ? 'narration'
        : characterName || 'dialogue'

    const fileName = `audio/${projectId}/scene-${sceneIndex}-${fileDescriptor}${languageSuffix}-${Date.now()}.mp3`

    const blob = await put(fileName, audioBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
    })

    console.log(`[Scene Audio] Uploaded to Blob:`, blob.url)

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
    return await generateGoogleAudio(text, voiceConfig)
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

  // Select model based on language:
  // - eleven_turbo_v2_5: Fast, production-ready, supports 32 languages including Thai
  // - eleven_v3: Newest flagship model with best quality for 70+ languages (Alpha)
  // 
  // Languages that work well with turbo_v2_5: en, es, fr, de, it, pt, pl, nl, ru, cs, tr, th, etc.
  // For maximum quality on complex tonal languages, use eleven_v3
  // 
  // NOTE: Do NOT use eleven_multilingual_v2 for Thai - it only supports 29 languages
  // and does not officially support Thai (will produce gibberish)
  
  // Use eleven_v3 for best quality on Asian/tonal languages, turbo_v2_5 for others
  // eleven_v3 handles Thai tones and nuances much better than turbo_v2_5
  const v3Languages = ['th', 'vi', 'id', 'ms'] // Languages that benefit from v3's improved tonal handling
  const useV3Model = v3Languages.includes(language)
  
  // Default model selection: v3 for tonal languages, turbo_v2_5 for everything else
  const defaultModelId = useV3Model ? 'eleven_v3' : 'eleven_turbo_v2_5'
  const modelId = process.env.ELEVENLABS_MODEL_ID || defaultModelId
  
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
    v3Languages: v3Languages.join(', ')
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

async function generateGoogleAudio(text: string, voiceConfig: VoiceConfig): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Google API key not configured')

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: voiceConfig.languageCode || 'en-US',
          name: voiceConfig.voiceId,
        },
        audioConfig: {
          audioEncoding: 'MP3',
        },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Google TTS API error: ${response.status}`)
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
  
  // NOTE: We intentionally do NOT delete old audio blobs synchronously here.
  // Synchronous deletion causes 404 errors when UI components still reference the old URL.
  // Orphaned blobs will be cleaned up via scheduled cleanup job or admin action.
  // See: https://github.com/anderson0531/sceneflowai/issues/audio-404-fix
  if (oldAudioUrl && oldAudioUrl !== audioUrl) {
    console.log('[Update Scene Audio] Old audio URL detected, skipping immediate deletion to prevent 404s:', oldAudioUrl)
  }
}
