import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'

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
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, sceneIndex, audioType, text, voiceConfig, characterName } = await req.json()

    // Log the request for debugging
    console.log('[Scene Audio] Request:', { 
      projectId, 
      sceneIndex, 
      audioType, 
      characterName,
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

    // Generate audio using specified provider
    const audioBuffer = await generateAudio(text, voiceConfig)

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
    await updateSceneAudio(projectId, sceneIndex, audioType, blob.url, characterName)

    return NextResponse.json({
      success: true,
      audioUrl: blob.url,
      audioType,
      characterName
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
  characterName?: string
) {
  await sequelize.authenticate()
  const project = await Project.findByPk(projectId)
  if (!project) throw new Error('Project not found')

  const metadata = project.metadata || {}
  const visionPhase = metadata.visionPhase || {}
  const script = visionPhase.script || {}
  const scenes = script.script?.scenes || script.scenes || []

  // Update the specific scene
  const updatedScenes = scenes.map((s: any, idx: number) => {
    if (idx !== sceneIndex) return s

    if (audioType === 'narration') {
      return {
        ...s,
        narrationAudioUrl: audioUrl,
        narrationAudioGeneratedAt: new Date().toISOString(),
      }
    } else {
      // Dialogue audio
      const dialogueAudio = s.dialogueAudio || []
      const existingIndex = dialogueAudio.findIndex((d: any) => d.character === characterName)
      
      if (existingIndex >= 0) {
        dialogueAudio[existingIndex] = { character: characterName, audioUrl }
      } else {
        dialogueAudio.push({ character: characterName, audioUrl })
      }

      return {
        ...s,
        dialogueAudio,
        dialogueAudioGeneratedAt: new Date().toISOString(),
      }
    }
  })

  // Update metadata
  await project.update({
    metadata: {
      ...metadata,
      visionPhase: {
        ...visionPhase,
        script: {
          ...script,
          script: { scenes: updatedScenes },
        },
      },
    },
  })
}
