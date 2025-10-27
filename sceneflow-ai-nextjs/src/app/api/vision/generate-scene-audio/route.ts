import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { optimizeTextForTTS } from '../../../../lib/tts/textOptimizer'

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
    const { projectId, sceneIndex, audioType, text, voiceConfig, characterName, dialogueIndex } = await req.json()

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

    console.log(`[Scene Audio] Generating ${audioType} for scene ${sceneIndex}`)

    // Optimize text for TTS (remove stage directions, clean up)
    const optimized = optimizeTextForTTS(text)
    console.log('[Scene Audio] Text optimization:', {
      original: text.substring(0, 100),
      optimized: optimized.text.substring(0, 100),
      cues: optimized.cues,
      reduction: `${optimized.originalLength} -> ${optimized.optimizedLength} chars`,
      isSpeakable: optimized.isSpeakable
    })

    // Check if text is speakable (not just stage directions)
    if (!optimized.isSpeakable) {
      console.log('[Scene Audio] Skipping TTS - text is not speakable (stage directions only)')
      return NextResponse.json({
        success: false,
        error: 'Text contains only stage directions and cannot be spoken',
        audioUrl: null
      }, { status: 200 }) // Return 200 (success) but indicate no audio was generated
    }

    // Generate audio using specified provider with optimized text
    const audioBuffer = await generateAudio(optimized.text, voiceConfig)

    // Upload to Vercel Blob
    const fileName = characterName
      ? `audio/${projectId}/scene-${sceneIndex}-${characterName}-${Date.now()}.mp3`
      : `audio/${projectId}/scene-${sceneIndex}-narration-${Date.now()}.mp3`

    const blob = await put(fileName, audioBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
    })

    console.log(`[Scene Audio] Uploaded to Blob:`, blob.url)

    // Update scene in project metadata
    await updateSceneAudio(projectId, sceneIndex, audioType, blob.url, characterName, dialogueIndex)

    return NextResponse.json({
      success: true,
      audioUrl: blob.url,
      audioType,
      characterName,
      dialogueIndex
    })
  } catch (error: any) {
    console.error('[Scene Audio] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Audio generation failed' },
      { status: 500 }
    )
  }
}

async function generateAudio(text: string, voiceConfig: VoiceConfig): Promise<Buffer> {
  if (voiceConfig.provider === 'elevenlabs') {
    try {
      return await generateElevenLabsAudio(text, voiceConfig)
    } catch (error: any) {
      console.warn('[Audio] ElevenLabs failed, falling back to Google TTS:', error.message)
      // Fallback to Google with a default voice
      return await generateGoogleAudio(text, {
        ...voiceConfig,
        provider: 'google',
        voiceId: 'en-US-Neural2-J',  // Default Google voice
        languageCode: 'en-US'
      })
    }
  } else {
    return await generateGoogleAudio(text, voiceConfig)
  }
}

async function generateElevenLabsAudio(text: string, voiceConfig: VoiceConfig): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error('ElevenLabs API key not configured')

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: voiceConfig.stability || 0.5,
          similarity_boost: voiceConfig.similarityBoost || 0.75,
        },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
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
  audioType: 'narration' | 'dialogue',
  audioUrl: string,
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
    sceneCount: existingScenes.length
  })

  // Update the specific scene
  const updatedScenes = existingScenes.map((s: any, idx: number) => {
    if (idx !== sceneIndex) return s

    if (audioType === 'narration') {
      return {
        ...s,
        narrationAudioUrl: audioUrl,
        narrationAudioGeneratedAt: new Date().toISOString(),
      }
    } else {
      // Dialogue audio - match by both character and dialogueIndex
      const dialogueAudio = [...(s.dialogueAudio || [])]
      const existingIndex = dialogueAudio.findIndex((d: any) => 
        d.character === characterName && d.dialogueIndex === dialogueIndex
      )
      
      if (existingIndex >= 0) {
        dialogueAudio[existingIndex] = { character: characterName, dialogueIndex, audioUrl }
      } else {
        dialogueAudio.push({ character: characterName, dialogueIndex, audioUrl })
      }

      return {
        ...s,
        dialogueAudio,
        dialogueAudioGeneratedAt: new Date().toISOString(),
      }
    }
  })

  // FIX: Preserve the existing structure (don't create double nesting)
  const updatedScript = script.script?.scenes
    ? { ...script, script: { ...script.script, scenes: updatedScenes } }  // Preserve script.script.scenes
    : { ...script, scenes: updatedScenes }  // Use script.scenes

  console.log('[Update Scene Audio] Updating with structure:', {
    hasScriptScript: !!updatedScript.script,
    hasScriptScenes: !!updatedScript.scenes
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
  
  console.log('[Update Scene Audio] Project updated successfully')
}
